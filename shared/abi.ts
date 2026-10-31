// generated from contracts/src/FlatStreet.sol via `forge inspect FlatStreet abi`
export const flatStreetAbi = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "wif_",
    "type": "address",
    "internalType": "contract IERC20"
   },
   {
    "name": "owner_",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "BPS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "BURN_BPS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "DEAD",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "LIVENESS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MAX_ASSETS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MAX_ENTRIES_PER_WALLET",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MAX_PRICE_AGE",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "PICKS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "REF_BPS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "ROLL_BPS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "acceptOwnership",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "addAsset",
  "inputs": [
   {
    "name": "token",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "feed",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "symbol",
    "type": "string",
    "internalType": "string"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "assetCount",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "assetReturns",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "int256[]",
    "internalType": "int256[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "assets",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "tuple[]",
    "internalType": "struct FlatStreet.Asset[]",
    "components": [
     {
      "name": "token",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "feed",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "symbol",
      "type": "string",
      "internalType": "string"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "cancel",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "claim",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "claimable",
  "inputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "createRound",
  "inputs": [
   {
    "name": "lockTime",
    "type": "uint64",
    "internalType": "uint64"
   },
   {
    "name": "endTime",
    "type": "uint64",
    "internalType": "uint64"
   },
   {
    "name": "entryFee",
    "type": "uint128",
    "internalType": "uint128"
   }
  ],
  "outputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "enter",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "picks",
    "type": "uint8[5]",
    "internalType": "uint8[5]"
   },
   {
    "name": "referrer",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "entryId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "entries",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "offset",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "limit",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "out",
    "type": "tuple[]",
    "internalType": "struct FlatStreet.Entry[]",
    "components": [
     {
      "name": "player",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "referrer",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "picks",
      "type": "uint40",
      "internalType": "uint40"
     },
     {
      "name": "refunded",
      "type": "bool",
      "internalType": "bool"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "finish",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "hints",
    "type": "uint80[]",
    "internalType": "uint80[]"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "getRound",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "tuple",
    "internalType": "struct FlatStreet.Round",
    "components": [
     {
      "name": "lockTime",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "endTime",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "entryCount",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "cursor",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "assetCount",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "status",
      "type": "uint8",
      "internalType": "enum FlatStreet.Status"
     },
     {
      "name": "entryFee",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "pot",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "referred",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "winners",
      "type": "uint32[3]",
      "internalType": "uint32[3]"
     },
     {
      "name": "topScores",
      "type": "int256[3]",
      "internalType": "int256[3]"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "keeper",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "lock",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "hints",
    "type": "uint80[]",
    "internalType": "uint80[]"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "owner",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "pendingOwner",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "playerEntries",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "player",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint32[]",
    "internalType": "uint32[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "refund",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "entryIds",
    "type": "uint256[]",
    "internalType": "uint256[]"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "renounceOwnership",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "rollover",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "roundCount",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "scoreOf",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "entryId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "setKeeper",
  "inputs": [
   {
    "name": "k",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "settle",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "maxEntries",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "sponsor",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "amount",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "startPrices",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "int256[]",
    "internalType": "int256[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "totalBurned",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "transferOwnership",
  "inputs": [
   {
    "name": "newOwner",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "unpack",
  "inputs": [
   {
    "name": "packed",
    "type": "uint40",
    "internalType": "uint40"
   }
  ],
  "outputs": [
   {
    "name": "picks",
    "type": "uint8[5]",
    "internalType": "uint8[5]"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "function",
  "name": "wif",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IERC20"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "event",
  "name": "AssetAdded",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "token",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "feed",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "symbol",
    "type": "string",
    "indexed": false,
    "internalType": "string"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Cancelled",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Claimed",
  "inputs": [
   {
    "name": "player",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Entered",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "entryId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "player",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "picks",
    "type": "uint8[5]",
    "indexed": false,
    "internalType": "uint8[5]"
   },
   {
    "name": "referrer",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Finished",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "KeeperSet",
  "inputs": [
   {
    "name": "keeper",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Locked",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "potWithRollover",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "OwnershipTransferStarted",
  "inputs": [
   {
    "name": "previousOwner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "newOwner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "OwnershipTransferred",
  "inputs": [
   {
    "name": "previousOwner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "newOwner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Refunded",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "entryId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "player",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "RoundCreated",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "lockTime",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   },
   {
    "name": "endTime",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   },
   {
    "name": "entryFee",
    "type": "uint128",
    "indexed": false,
    "internalType": "uint128"
   },
   {
    "name": "assetCount",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Settled",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "winners",
    "type": "uint32[3]",
    "indexed": false,
    "internalType": "uint32[3]"
   },
   {
    "name": "scores",
    "type": "int256[3]",
    "indexed": false,
    "internalType": "int256[3]"
   },
   {
    "name": "burned",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "rolled",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Sponsored",
  "inputs": [
   {
    "name": "roundId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "sponsor",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "BadHint",
  "inputs": [
   {
    "name": "assetId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "BadPicks",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadStatus",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadTimes",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotKeeper",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NothingToClaim",
  "inputs": []
 },
 {
  "type": "error",
  "name": "OwnableInvalidOwner",
  "inputs": [
   {
    "name": "owner",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "OwnableUnauthorizedAccount",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "ReentrancyGuardReentrantCall",
  "inputs": []
 },
 {
  "type": "error",
  "name": "SafeERC20FailedOperation",
  "inputs": [
   {
    "name": "token",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "TooEarly",
  "inputs": []
 },
 {
  "type": "error",
  "name": "TooManyEntries",
  "inputs": []
 }
] as const;

export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const feedAbi = [
  { type: "function", name: "latestRoundData", stateMutability: "view", inputs: [], outputs: [{ type: "uint80" }, { type: "int256" }, { type: "uint256" }, { type: "uint256" }, { type: "uint80" }] },
  { type: "function", name: "getRoundData", stateMutability: "view", inputs: [{ name: "id", type: "uint80" }], outputs: [{ type: "uint80" }, { type: "int256" }, { type: "uint256" }, { type: "uint256" }, { type: "uint80" }] },
] as const;
