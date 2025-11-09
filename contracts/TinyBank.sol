// staking
// deposit(MyToken) / withdraw(MyToken)

// MyToken : token balance management
// - the balance of TinyBank address
// TinyBank : deposit / withdraw vault
// - users token management
// - user ---> deposit ---> TinyBank ---> transfer(TinyBank --> user)

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./MultiManagedAccess.sol";

interface IMyToken {
    function transfer(uint256 amount, address to) external;

    function transferFrom(address from, address to, uint256 amount) external;

    function mint(uint256 amount, address owner) external;
}

contract TinyBank is MultiManagedAccess {
    event Staked(address from, uint256 amount);
    event Withdraw(uint256 amount, address to);

    IMyToken public stakingToken;

    mapping(address => uint256) public lastClaimedBlock;

    uint256 defaultRewardPerblock = 1 * 10 ** 18;
    uint256 rewardPerBlock; 

    mapping (address => uint256) public staked;
    uint256 public totalStaked;

    constructor(IMyToken _stakingToken, address[3] memory _managers)
        MultiManagedAccess(msg.sender, _managers, 3)
    {
        stakingToken = _stakingToken;
        rewardPerBlock = defaultRewardPerblock;
    }


//who, when?
//genesis staking
    modifier updateReward(address to) {
        if (staked[to] > 0) {
            uint256 blocks = block.number - lastClaimedBlock[to];
            uint256 reward = (blocks * rewardPerBlock * staked[to]) / 
                totalStaked;
            stakingToken.mint(reward, to);
        }
        lastClaimedBlock[to] = block.number;
        _;
    }

    function setRewardPerBlock(uint256 _amount) external {
    bool found = false;
    for (uint i = 0; i < MANAGER_NUMBERS; i++) {
        if (managers[i] == msg.sender) {
            found = true;
            break;
        }
    }
    require(found, "You are not a manager");
    require(allConfirmed(), "Not all managers confirmed yet");
    reset();
    rewardPerBlock = _amount;
}


    function stake(uint256 _amount) external updateReward(msg.sender){
        require(_amount >= 0, "cannot stake 0 amount");
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        staked[msg.sender] += _amount;
        totalStaked += _amount;
        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external updateReward(msg.sender){
        require(staked[msg.sender] >= _amount, "insufficient staked token");
        stakingToken.transfer( _amount, msg.sender);
        staked[msg.sender] -= _amount;
        totalStaked -= _amount;
        emit Withdraw(_amount, msg.sender);
    }
}

