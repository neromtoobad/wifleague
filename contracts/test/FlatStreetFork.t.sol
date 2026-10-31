// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {FlatStreet, IAggregatorV3} from "../src/FlatStreet.sol";

/// Runs a full round against live Robinhood Chain state: real $WIF (and its burn), real Chainlink feeds.
contract FlatStreetForkTest is Test {
    IERC20 constant WIF = IERC20(0x5173b8eA6923c2d40267890D45C46a3480954773);
    FlatStreet fs;
    address[6] feeds = [
        0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15, // NVDA
        0x4A1166a659A55625345e9515b32adECea5547C38, // TSLA
        0x6B22A786bAa607d76728168703a39Ea9C99f2cD0, // AAPL
        0x820ABedFF239034956B7A9d2F0a331f9F075eB4c, // PLTR
        0x27C71df6A64fB476468EdF256CF72c038baB5B67, // GME
        0x319724394D3A0e3669269846abE664Cd621f9f6A // SPY
    ];

    function setUp() public {
        vm.createSelectFork("robinhood");
        fs = new FlatStreet(WIF, address(this));
        for (uint256 i; i < 6; ++i) {
            fs.addAsset(address(uint160(i + 1)), feeds[i], "T");
        }
    }

    function _hints() internal view returns (uint80[] memory h) {
        h = new uint80[](6);
        for (uint256 i; i < 6; ++i) {
            (uint80 id,,,,) = IAggregatorV3(feeds[i]).latestRoundData();
            h[i] = id;
        }
    }

    function test_fork_realWifAndFeeds() public {
        uint64 lockT = uint64(block.timestamp + 60);
        uint64 endT = uint64(block.timestamp + 120);
        fs.createRound(lockT, endT, 2_500e18);
        address p = address(0xBEEF);
        deal(address(WIF), p, 10_000e18);
        vm.startPrank(p);
        WIF.approve(address(fs), type(uint256).max);
        fs.enter(0, [uint8(0), 1, 2, 3, 4], address(0));
        vm.stopPrank();

        uint256 supply = WIF.totalSupply();
        vm.warp(lockT + 1);
        fs.lock(0, _hints());
        vm.warp(endT + 1);
        fs.finish(0, _hints());
        fs.settle(0, 50);

        assertEq(uint8(fs.getRound(0).status), uint8(FlatStreet.Status.Settled));
        assertEq(WIF.totalSupply(), supply - 250e18, "real burn reduced supply");
        assertGt(fs.startPrices(0)[0], 0);
    }
}
