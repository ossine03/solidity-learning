import hre from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { DECIMALS, MINTING_AMOUNT } from "./constant";

describe("My Token", () => {
  let myTokenC: MyToken;
  let signers: HardhatEthersSigner[];
  beforeEach("should deploy", async () => {
    signers = await hre.ethers.getSigners();
    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);
  });
  describe("Basic state value check", () => {
    it("should return name", async () => {
      expect(await myTokenC.name()).equal("MyToken");
    });
    it("should return symbol", async () => {
      expect(await myTokenC.symbol()).equal("MT");
    });
    it("should return DECIMALS", async () => {
      expect(await myTokenC.decimals()).equal(DECIMALS);
    });
    it("should return 100 totalSupply", async () => {
      expect(await myTokenC.totalSupply()).to.equal(
        hre.ethers.parseUnits(MINTING_AMOUNT.toString(), Number(DECIMALS))
      );
    });
  });
  describe("Mint", () => {
    it("should return 1MT balance for signer 0", async () => {
      const signer0 = signers[0];
      expect(await myTokenC.balanceOf(signer0)).equal(100n * 10n ** 18n);
    });

    it("should return or revert when minting infinitly", async () => {
      const hacker = signers[2];
      const mintingAgainAmount = hre.ethers.parseUnits("10000", DECIMALS);
      await expect(
        myTokenC.connect(hacker).mint(mintingAgainAmount, hacker.address)
      ).to.be.revertedWith("You are not authorized to manage this token");
    });
  });
  describe("transfer", () => {
    it("should have 0.5MT", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      await expect(
        myTokenC.transfer(
          hre.ethers.parseUnits("0.5", DECIMALS),
          signer1.address
        )
      )
        .to.emit(myTokenC, "Transfer")
        .withArgs(
          signer0.address,
          signer1.address,
          hre.ethers.parseUnits("0.5", DECIMALS)
        );
      expect(await myTokenC.balanceOf(signer1.address)).equal(
        hre.ethers.parseUnits("0.5", DECIMALS)
      );
      const filter = {
        address: await myTokenC.getAddress(),
        topics: [hre.ethers.id("Transfer(address,address,uint256)")],
      };
      const logs = await hre.ethers.provider.getLogs(filter);
      console.log(logs.length);
      for (const log of logs) {
        const parsed = myTokenC.interface.parseLog(log);
        console.log("from:", parsed.args[0]);
        console.log("to:", parsed.args[1]);
        console.log("value:", parsed.args[2]);
      }
    });
    it("should be reverted with insufficient balance error", async () => {
      const signer1 = signers[1];
      await expect(
        myTokenC.transfer(
          hre.ethers.parseUnits((MINTING_AMOUNT + 1n).toString(), DECIMALS),
          signer1.address
        )
      ).to.be.revertedWith("insufficient balance");
    });
  });
  describe("TransferFrom", () => {
    it("should approve, transferFrom, and check balances", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];

      await expect(
        myTokenC
          .connect(signer0)
          .approve(
            signer1.address,
            hre.ethers.parseUnits("10", Number(DECIMALS))
          )
      )
        .to.emit(myTokenC, "Approval")
        .withArgs(
          signer0.address,
          signer1.address,
          hre.ethers.parseUnits("10", Number(DECIMALS))
        );

      await expect(
        myTokenC
          .connect(signer1)
          .transferFrom(
            signer0.address,
            signer1.address,
            hre.ethers.parseUnits("5", DECIMALS)
          )
      )
        .to.emit(myTokenC, "Transfer")
        .withArgs(
          signer0.address,
          signer1.address,
          hre.ethers.parseUnits("5", DECIMALS)
        );

      const balance0 = await myTokenC.balanceOf(signer0.address);
      const balance1 = await myTokenC.balanceOf(signer1.address);

      expect(balance0).equal(hre.ethers.parseUnits("95", DECIMALS));
      expect(balance1).equal(hre.ethers.parseUnits("5", DECIMALS));
    });
  });
});
