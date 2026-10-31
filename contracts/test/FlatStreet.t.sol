// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {FlatStreet} from "../src/FlatStreet.sol";

contract MockWIF is ERC20 {
    constructor() ERC20("World is Flat", "WIF") {}

    function mint(address to, uint256 amt) external {
        _mint(to, amt);
    }

    function burn(uint256 amt) external {
        _burn(msg.sender, amt);
    }
}

/// Chainlink-style feed with a full round history.
contract MockFeed {
    struct R {
        int256 answer;
        uint256 updatedAt;
    }

    R[] internal rounds; // round id = index + 1 (phase 0)

    function push(int256 answer, uint256 at) external {
        rounds.push(R(answer, at));
    }

    function decimals() external pure returns (uint8) {
        return 8;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        uint80 id = uint80(rounds.length);
        R memory r = rounds[id - 1];
        return (id, r.answer, r.updatedAt, r.updatedAt, id);
    }

    function getRoundData(uint80 id) external view returns (uint80, int256, uint256, uint256, uint80) {
        require(id >= 1 && id <= rounds.length, "No data present");
        R memory r = rounds[id - 1];
        return (id, r.answer, r.updatedAt, r.updatedAt, id);
    }
}

contract FlatStreetTest is Test {
    MockWIF wif;
    FlatStreet fs;
    MockFeed[6] feeds;
    address owner = address(0xA11CE);
    address alice = address(0xA);
    address bob = address(0xB);
    address carol = address(0xC);
    address dave = address(0xD);
    uint128 constant FEE = 1_000e18;

    uint64 lockT;
    uint64 endT;

    function setUp() public {
        vm.warp(1_000_000);
        wif = new MockWIF();
        fs = new FlatStreet(IERC20(address(wif)), owner);
        for (uint256 i; i < 6; ++i) {
            feeds[i] = new MockFeed();
            feeds[i].push(100e8, block.timestamp - 10);
            vm.prank(owner);
            fs.addAsset(address(uint160(0x1000 + i)), address(feeds[i]), "TKR");
        }
        address[4] memory ps = [alice, bob, carol, dave];
        for (uint256 i; i < 4; ++i) {
            wif.mint(ps[i], 100_000e18);
            vm.prank(ps[i]);
            wif.approve(address(fs), type(uint256).max);
        }
        lockT = uint64(block.timestamp + 1 days);
        endT = uint64(block.timestamp + 6 days);
        vm.prank(owner);
        fs.createRound(lockT, endT, FEE);
    }

    function _picks(uint8 a, uint8 b, uint8 c, uint8 d, uint8 e) internal pure returns (uint8[5] memory p) {
        p = [a, b, c, d, e];
    }

    /// heartbeat: every feed republishes its last price at `at`
    function _beat(uint256 at) internal {
        for (uint256 i; i < 6; ++i) {
            (, int256 a,,,) = feeds[i].latestRoundData();
            feeds[i].push(a, at);
        }
    }

    function _hints() internal view returns (uint80[] memory h) {
        h = new uint80[](6);
        for (uint256 i; i < 6; ++i) {
            (uint80 id,,,,) = feeds[i].latestRoundData();
            h[i] = id;
        }
    }

    /// price feed i moves to `price` at time `at`
    function _move(uint256 i, int256 price, uint256 at) internal {
        feeds[i].push(price, at);
    }

    function test_fullRound_paysPodium_burns_rolls() public {
        vm.prank(alice);
        fs.enter(0, _picks(0, 1, 2, 3, 4), bob); // captain asset 0
        vm.prank(bob);
        fs.enter(0, _picks(5, 1, 2, 3, 4), address(0)); // captain asset 5
        vm.prank(carol);
        fs.enter(0, _picks(1, 2, 3, 4, 5), address(0));
        vm.prank(dave);
        fs.enter(0, _picks(4, 3, 2, 1, 0), address(0));

        vm.warp(lockT + 1);
        fs.lock(0, _hints());

        // asset 5 +50%, asset 0 +20%, others flat
        _beat(endT - 200);
        _move(5, 150e8, endT - 100);
        _move(0, 120e8, endT - 100);
        vm.warp(endT + 1);
        fs.finish(0, _hints());
        fs.settle(0, 2);
        fs.settle(0, 10);

        FlatStreet.Round memory r = fs.getRound(0);
        assertEq(uint8(r.status), uint8(FlatStreet.Status.Settled));
        // bob: (2*0.5)/6 ; carol: 0.5/6 ; alice: (2*0.2)/6 ; dave: 0.2/6
        assertEq(r.winners[0], 2); // bob
        assertEq(r.winners[1], 3); // carol
        assertEq(r.winners[2], 1); // alice

        uint256 refCut = (uint256(FEE) * 500) / 10_000;
        uint256 pot = 4 * uint256(FEE) - refCut;
        uint256 prizes = pot - pot / 10 - pot / 10;
        assertEq(fs.claimable(bob), (prizes * 5000) / 10_000 + refCut); // won + referral
        assertEq(fs.claimable(carol), (prizes * 3000) / 10_000);
        assertEq(fs.claimable(alice), (prizes * 2000) / 10_000);
        assertEq(fs.claimable(dave), 0);
        assertEq(fs.totalBurned(), pot / 10);
        assertEq(wif.totalSupply(), 400_000e18 - pot / 10);
        assertEq(fs.rollover(), pot / 10);

        uint256 before = wif.balanceOf(bob);
        vm.prank(bob);
        fs.claim();
        assertEq(wif.balanceOf(bob) - before, (prizes * 5000) / 10_000 + refCut);
    }

    function test_rolloverJoinsNextPotAtLock() public {
        vm.prank(alice);
        fs.enter(0, _picks(0, 1, 2, 3, 4), address(0));
        vm.warp(lockT + 1);
        fs.lock(0, _hints());
        _beat(endT - 50);
        vm.warp(endT + 1);
        fs.finish(0, _hints());
        fs.settle(0, 10);
        // single entrant: 1st takes 50% of prizes, 2nd/3rd shares roll
        uint256 pot = FEE;
        uint256 prizes = pot - pot / 10 - pot / 10;
        uint256 rolled = pot / 10 + prizes - (prizes * 5000) / 10_000;
        assertEq(fs.rollover(), rolled);

        vm.prank(owner);
        fs.createRound(uint64(block.timestamp + 1 days), uint64(block.timestamp + 2 days), FEE);
        vm.prank(bob);
        fs.enter(1, _picks(0, 1, 2, 3, 4), address(0));
        vm.warp(block.timestamp + 1 days + 1);
        fs.lock(1, _hints());
        assertEq(fs.getRound(1).pot, FEE + rolled);
        assertEq(fs.rollover(), 0);
    }

    function test_lockRejectsStaleOrFutureHints() public {
        vm.prank(alice);
        fs.enter(0, _picks(0, 1, 2, 3, 4), address(0));
        // a price published after lock must not be usable as the start price
        _move(0, 90e8, lockT + 10);
        vm.warp(lockT + 20);
        uint80[] memory h = _hints(); // asset 0 hint is round 2, published after lockT
        vm.expectRevert(abi.encodeWithSelector(FlatStreet.BadHint.selector, 0));
        fs.lock(0, h);
        // a hint that is too old (a newer round exists before t) is also rejected
        _move(1, 101e8, lockT - 5);
        _move(1, 102e8, lockT + 5);
        h[0] = 1;
        h[1] = 1; // round 2 (lockT-5) is the right one
        vm.expectRevert(abi.encodeWithSelector(FlatStreet.BadHint.selector, 1));
        fs.lock(0, h);
        h[1] = 2;
        fs.lock(0, h);
        assertEq(fs.startPrices(0)[0], 100e8);
        assertEq(fs.startPrices(0)[1], 101e8);
    }

    function test_enterValidation() public {
        vm.startPrank(alice);
        vm.expectRevert(FlatStreet.BadPicks.selector);
        fs.enter(0, _picks(0, 0, 1, 2, 3), address(0));
        vm.expectRevert(FlatStreet.BadPicks.selector);
        fs.enter(0, _picks(0, 1, 2, 3, 9), address(0));
        fs.enter(0, _picks(0, 1, 2, 3, 4), address(0));
        fs.enter(0, _picks(0, 1, 2, 3, 5), address(0));
        fs.enter(0, _picks(1, 0, 2, 3, 5), address(0));
        vm.expectRevert(FlatStreet.TooManyEntries.selector);
        fs.enter(0, _picks(2, 0, 1, 3, 5), address(0));
        vm.stopPrank();
        vm.warp(lockT);
        vm.prank(bob);
        vm.expectRevert(FlatStreet.BadStatus.selector);
        fs.enter(0, _picks(0, 1, 2, 3, 4), address(0));
    }

    function test_emptyRoundCancelsAndCarriesSponsorship() public {
        vm.prank(carol);
        fs.sponsor(0, 5_000e18);
        vm.warp(lockT + 1);
        fs.lock(0, _hints());
        assertEq(uint8(fs.getRound(0).status), uint8(FlatStreet.Status.Cancelled));
        assertEq(fs.rollover(), 5_000e18);
    }

    function test_stuckRoundRefunds() public {
        vm.prank(alice);
        fs.enter(0, _picks(0, 1, 2, 3, 4), address(0));
        vm.prank(carol);
        fs.sponsor(0, 500e18);
        vm.expectRevert(FlatStreet.BadStatus.selector);
        fs.cancel(0);
        vm.warp(uint256(lockT) + 7 days + 1);
        fs.cancel(0);
        uint256[] memory ids = new uint256[](1);
        uint256 before = wif.balanceOf(alice);
        vm.prank(bob); // not the owner of entry 0: no-op
        fs.refund(0, ids);
        vm.prank(alice);
        fs.refund(0, ids);
        vm.prank(alice);
        fs.refund(0, ids); // double refund is a no-op
        assertEq(wif.balanceOf(alice) - before, FEE);
        assertEq(fs.rollover(), 500e18);
    }

    function test_onlyOwnerOrKeeperCreates() public {
        vm.expectRevert(FlatStreet.NotKeeper.selector);
        fs.createRound(uint64(block.timestamp + 10), uint64(block.timestamp + 20), FEE);
        vm.prank(owner);
        fs.setKeeper(bob);
        vm.prank(bob);
        fs.createRound(uint64(block.timestamp + 10), uint64(block.timestamp + 20), FEE);
    }

    function test_tieKeepsEarlierEntry() public {
        vm.prank(alice);
        fs.enter(0, _picks(0, 1, 2, 3, 4), address(0));
        vm.prank(bob);
        fs.enter(0, _picks(0, 1, 2, 3, 4), address(0));
        vm.warp(lockT + 1);
        fs.lock(0, _hints());
        _beat(endT - 50);
        vm.warp(endT + 1);
        fs.finish(0, _hints());
        fs.settle(0, 10);
        FlatStreet.Round memory r = fs.getRound(0);
        assertEq(r.winners[0], 1);
        assertEq(r.winners[1], 2);
    }
}
