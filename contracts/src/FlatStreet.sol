// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
    function getRoundData(uint80 roundId) external view returns (uint80, int256, uint256, uint256, uint80);
}

interface IBurnable {
    function burn(uint256 amount) external;
}

/// @title Flat Street — a fantasy stock league paid in $WIF.
/// @notice Draft 5 Stock Tokens (first pick is your captain and counts double), pay the entry in $WIF,
///         and the best lineups by Chainlink-measured return take the pot. Every round burns $WIF and
///         rolls a slice into the next pot. Prices are read at the exact lock/end timestamps from
///         Chainlink round history, so nobody can pick a favourable moment to settle.
contract FlatStreet is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant PICKS = 5;
    uint256 public constant MAX_ASSETS = 64;
    uint256 public constant MAX_ENTRIES_PER_WALLET = 3;
    uint256 public constant BPS = 10_000;
    uint256 public constant BURN_BPS = 1_000; // 10% of the pot is burned
    uint256 public constant ROLL_BPS = 1_000; // 10% seeds the next round
    uint256 public constant REF_BPS = 500; // 5% of a referred entry fee goes to the referrer
    uint256 public constant MAX_PRICE_AGE = 4 days; // covers a long weekend with the market closed
    uint256 public constant LIVENESS = 7 days; // a round that can't be priced for this long can be cancelled
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    IERC20 public immutable wif;

    struct Asset {
        address token;
        address feed;
        string symbol;
    }

    enum Status {
        None,
        Open,
        Live,
        Scoring,
        Settled,
        Cancelled
    }

    struct Round {
        uint64 lockTime;
        uint64 endTime;
        uint32 entryCount;
        uint32 cursor;
        uint8 assetCount;
        Status status;
        uint128 entryFee;
        uint256 pot; // entry fees + sponsorships (+ rollover once live)
        uint256 referred; // number of entries that named a referrer
        uint32[3] winners; // 1-based entry ids, 0 = empty
        int256[3] topScores;
    }

    struct Entry {
        address player;
        address referrer;
        uint40 picks; // 5 x uint8 asset ids, picks[0] is the captain
        bool refunded;
    }

    Asset[] internal _assets;
    Round[] internal _rounds;
    mapping(uint256 => Entry[]) internal _entries;
    mapping(uint256 => int256[]) internal _startPrices;
    mapping(uint256 => int256[]) internal _returns; // 1e18-scaled return per asset
    mapping(uint256 => mapping(address => uint32[])) internal _playerEntries;

    mapping(address => uint256) public claimable;
    uint256 public rollover;
    uint256 public totalBurned;
    address public keeper;

    uint16[3] internal PRIZE_BPS = [5_000, 3_000, 2_000];

    event AssetAdded(uint256 indexed id, address token, address feed, string symbol);
    event KeeperSet(address keeper);
    event RoundCreated(uint256 indexed roundId, uint64 lockTime, uint64 endTime, uint128 entryFee, uint8 assetCount);
    event Entered(uint256 indexed roundId, uint256 indexed entryId, address indexed player, uint8[5] picks, address referrer);
    event Sponsored(uint256 indexed roundId, address indexed sponsor, uint256 amount);
    event Locked(uint256 indexed roundId, uint256 potWithRollover);
    event Finished(uint256 indexed roundId);
    event Settled(uint256 indexed roundId, uint32[3] winners, int256[3] scores, uint256 burned, uint256 rolled);
    event Cancelled(uint256 indexed roundId);
    event Refunded(uint256 indexed roundId, uint256 indexed entryId, address player, uint256 amount);
    event Claimed(address indexed player, uint256 amount);

    error BadTimes();
    error BadPicks();
    error BadStatus();
    error TooEarly();
    error TooManyEntries();
    error BadHint(uint256 assetId);
    error NotKeeper();
    error NothingToClaim();

    constructor(IERC20 wif_, address owner_) Ownable(owner_) {
        wif = wif_;
    }

    // ───────────────────────── admin (can't touch pots) ─────────────────────────

    function addAsset(address token, address feed, string calldata symbol) external onlyOwner {
        require(_assets.length < MAX_ASSETS, "full");
        (, int256 answer,, uint256 updatedAt,) = IAggregatorV3(feed).latestRoundData();
        require(answer > 0 && updatedAt > 0, "dead feed");
        _assets.push(Asset(token, feed, symbol));
        emit AssetAdded(_assets.length - 1, token, feed, symbol);
    }

    function setKeeper(address k) external onlyOwner {
        keeper = k;
        emit KeeperSet(k);
    }

    function createRound(uint64 lockTime, uint64 endTime, uint128 entryFee) external returns (uint256 roundId) {
        if (msg.sender != owner() && msg.sender != keeper) revert NotKeeper();
        if (lockTime <= block.timestamp || endTime <= lockTime) revert BadTimes();
        require(_assets.length >= PICKS, "assets");
        roundId = _rounds.length;
        Round storage r = _rounds.push();
        r.lockTime = lockTime;
        r.endTime = endTime;
        r.entryFee = entryFee;
        r.assetCount = uint8(_assets.length);
        r.status = Status.Open;
        emit RoundCreated(roundId, lockTime, endTime, entryFee, r.assetCount);
    }

    // ───────────────────────────────── play ─────────────────────────────────

    function enter(uint256 roundId, uint8[5] calldata picks, address referrer)
        external
        nonReentrant
        returns (uint256 entryId)
    {
        Round storage r = _rounds[roundId];
        if (r.status != Status.Open || block.timestamp >= r.lockTime) revert BadStatus();
        if (_playerEntries[roundId][msg.sender].length >= MAX_ENTRIES_PER_WALLET) revert TooManyEntries();

        uint40 packed;
        for (uint256 i; i < PICKS; ++i) {
            if (picks[i] >= r.assetCount) revert BadPicks();
            for (uint256 j; j < i; ++j) {
                if (picks[i] == picks[j]) revert BadPicks();
            }
            packed |= uint40(picks[i]) << uint40(8 * i);
        }
        if (referrer == msg.sender) referrer = address(0);

        wif.safeTransferFrom(msg.sender, address(this), r.entryFee);
        r.pot += r.entryFee;
        if (referrer != address(0)) r.referred += 1;

        entryId = _entries[roundId].length;
        _entries[roundId].push(Entry(msg.sender, referrer, packed, false));
        _playerEntries[roundId][msg.sender].push(uint32(entryId));
        r.entryCount += 1;
        emit Entered(roundId, entryId, msg.sender, picks, referrer);
    }

    /// @notice Anyone (a project, a whale, a community) can top up a round's pot.
    function sponsor(uint256 roundId, uint256 amount) external nonReentrant {
        Round storage r = _rounds[roundId];
        if (r.status != Status.Open && r.status != Status.Live) revert BadStatus();
        wif.safeTransferFrom(msg.sender, address(this), amount);
        r.pot += amount;
        emit Sponsored(roundId, msg.sender, amount);
    }

    // ─────────────────────────── pricing & settling ───────────────────────────

    /// @notice Snapshot start prices as of lockTime. `hints[i]` is the Chainlink round id of asset i
    ///         that was current at lockTime (computed off-chain, verified here).
    function lock(uint256 roundId, uint80[] calldata hints) external {
        Round storage r = _rounds[roundId];
        if (r.status != Status.Open) revert BadStatus();
        if (block.timestamp < r.lockTime) revert TooEarly();

        if (r.entryCount == 0) {
            r.status = Status.Cancelled;
            rollover += r.pot; // sponsorship carries forward
            r.pot = 0;
            emit Cancelled(roundId);
            return;
        }

        int256[] storage prices = _startPrices[roundId];
        for (uint256 i; i < r.assetCount; ++i) {
            prices.push(_priceAt(i, hints[i], r.lockTime));
        }
        r.pot += rollover;
        rollover = 0;
        r.status = Status.Live;
        emit Locked(roundId, r.pot);
    }

    /// @notice Snapshot end prices as of endTime and freeze per-asset returns.
    function finish(uint256 roundId, uint80[] calldata hints) external {
        Round storage r = _rounds[roundId];
        if (r.status != Status.Live) revert BadStatus();
        if (block.timestamp < r.endTime) revert TooEarly();

        int256[] storage start = _startPrices[roundId];
        int256[] storage rets = _returns[roundId];
        for (uint256 i; i < r.assetCount; ++i) {
            int256 end = _priceAt(i, hints[i], r.endTime);
            rets.push(((end - start[i]) * 1e18) / start[i]);
        }
        r.status = Status.Scoring;
        emit Finished(roundId);
    }

    /// @notice Score up to `maxEntries` entries; pays out once every entry is scored.
    function settle(uint256 roundId, uint256 maxEntries) external nonReentrant {
        Round storage r = _rounds[roundId];
        if (r.status != Status.Scoring) revert BadStatus();

        Entry[] storage list = _entries[roundId];
        int256[] storage rets = _returns[roundId];
        uint256 stop = r.cursor + maxEntries;
        if (stop > r.entryCount) stop = r.entryCount;

        for (uint256 id = r.cursor; id < stop; ++id) {
            int256 s = _score(rets, list[id].picks);
            // strict ">" keeps the earlier entry on ties
            for (uint256 k; k < 3; ++k) {
                if (r.winners[k] == 0 || s > r.topScores[k]) {
                    for (uint256 m = 2; m > k; --m) {
                        r.winners[m] = r.winners[m - 1];
                        r.topScores[m] = r.topScores[m - 1];
                    }
                    r.winners[k] = uint32(id + 1);
                    r.topScores[k] = s;
                    break;
                }
            }
            if (list[id].referrer != address(0)) {
                claimable[list[id].referrer] += (uint256(r.entryFee) * REF_BPS) / BPS;
            }
        }
        r.cursor = uint32(stop);
        if (stop < r.entryCount) return;

        uint256 pot = r.pot - (r.referred * uint256(r.entryFee) * REF_BPS) / BPS;
        uint256 burned = (pot * BURN_BPS) / BPS;
        uint256 rolled = (pot * ROLL_BPS) / BPS;
        uint256 prizes = pot - burned - rolled;
        uint256 paid;
        for (uint256 k; k < 3; ++k) {
            uint256 share = (prizes * PRIZE_BPS[k]) / BPS;
            if (r.winners[k] == 0) continue;
            claimable[list[r.winners[k] - 1].player] += share;
            paid += share;
        }
        rolled += prizes - paid; // empty podium spots + dust roll forward
        rollover += rolled;
        r.status = Status.Settled;
        _burn(burned);
        emit Settled(roundId, r.winners, r.topScores, burned, rolled);
    }

    /// @notice If a round can't be priced within LIVENESS of its deadline, anyone can cancel it.
    function cancel(uint256 roundId) external {
        Round storage r = _rounds[roundId];
        bool stuckOpen = r.status == Status.Open && block.timestamp > r.lockTime + LIVENESS;
        bool stuckLive = r.status == Status.Live && block.timestamp > r.endTime + LIVENESS;
        if (!stuckOpen && !stuckLive) revert BadStatus();
        uint256 fees = uint256(r.entryCount) * r.entryFee;
        rollover += r.pot - fees; // sponsorship + rollover carry on
        r.pot = fees;
        r.status = Status.Cancelled;
        emit Cancelled(roundId);
    }

    function refund(uint256 roundId, uint256[] calldata entryIds) external nonReentrant {
        Round storage r = _rounds[roundId];
        if (r.status != Status.Cancelled) revert BadStatus();
        uint256 total;
        for (uint256 i; i < entryIds.length; ++i) {
            Entry storage e = _entries[roundId][entryIds[i]];
            if (e.refunded || e.player != msg.sender) continue;
            e.refunded = true;
            total += r.entryFee;
            emit Refunded(roundId, entryIds[i], msg.sender, r.entryFee);
        }
        r.pot -= total;
        if (total > 0) wif.safeTransfer(msg.sender, total);
    }

    function claim() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimable[msg.sender] = 0;
        wif.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    // ───────────────────────────────── views ─────────────────────────────────

    function assetCount() external view returns (uint256) {
        return _assets.length;
    }

    function assets() external view returns (Asset[] memory) {
        return _assets;
    }

    function roundCount() external view returns (uint256) {
        return _rounds.length;
    }

    function getRound(uint256 roundId) external view returns (Round memory) {
        return _rounds[roundId];
    }

    function startPrices(uint256 roundId) external view returns (int256[] memory) {
        return _startPrices[roundId];
    }

    function assetReturns(uint256 roundId) external view returns (int256[] memory) {
        return _returns[roundId];
    }

    function entries(uint256 roundId, uint256 offset, uint256 limit) external view returns (Entry[] memory out) {
        Entry[] storage all = _entries[roundId];
        if (offset >= all.length) return out;
        uint256 n = all.length - offset;
        if (n > limit) n = limit;
        out = new Entry[](n);
        for (uint256 i; i < n; ++i) {
            out[i] = all[offset + i];
        }
    }

    function playerEntries(uint256 roundId, address player) external view returns (uint32[] memory) {
        return _playerEntries[roundId][player];
    }

    function unpack(uint40 packed) public pure returns (uint8[5] memory picks) {
        for (uint256 i; i < PICKS; ++i) {
            picks[i] = uint8(packed >> uint40(8 * i));
        }
    }

    /// @notice Final score of an entry (1e18 = +100%), available once the round has finished.
    function scoreOf(uint256 roundId, uint256 entryId) external view returns (int256) {
        Status s = _rounds[roundId].status;
        if (s != Status.Scoring && s != Status.Settled) revert BadStatus();
        return _score(_returns[roundId], _entries[roundId][entryId].picks);
    }

    // ─────────────────────────────── internals ───────────────────────────────

    /// Captain (picks[0]) counts double: score = (2·r0 + r1 + r2 + r3 + r4) / 6.
    function _score(int256[] storage rets, uint40 packed) internal view returns (int256 s) {
        for (uint256 i; i < PICKS; ++i) {
            int256 ret = rets[uint8(packed >> uint40(8 * i))];
            s += i == 0 ? ret * 2 : ret;
        }
        s /= 6;
    }

    /// Price of asset `id` at time `t`, using a caller-supplied Chainlink round id that must be the
    /// last round published at or before `t`.
    function _priceAt(uint256 id, uint80 hint, uint256 t) internal view returns (int256) {
        IAggregatorV3 feed = IAggregatorV3(_assets[id].feed);
        (, int256 answer,, uint256 updatedAt,) = feed.getRoundData(hint);
        if (answer <= 0 || updatedAt == 0 || updatedAt > t || t - updatedAt > MAX_PRICE_AGE) revert BadHint(id);

        try feed.getRoundData(hint + 1) returns (uint80, int256, uint256, uint256 nextUpdatedAt, uint80) {
            if (nextUpdatedAt != 0 && nextUpdatedAt <= t) revert BadHint(id);
        } catch {
            // no next round in this phase: the hint must be the latest round, or a new phase began after it
            (uint80 latest,,,,) = feed.latestRoundData();
            if (latest != hint && uint16(latest >> 64) == uint16(hint >> 64)) revert BadHint(id);
        }
        return answer;
    }

    function _burn(uint256 amount) internal {
        if (amount == 0) return;
        totalBurned += amount;
        try IBurnable(address(wif)).burn(amount) {}
        catch {
            wif.safeTransfer(DEAD, amount);
        }
    }
}
