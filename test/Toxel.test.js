const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Toxel Contract", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployToxelFixture() {
    const [owner, addr1, addr2, fundAddress] = await ethers.getSigners();

    const initialPrice = ethers.parseEther("0.01"); // 0.01 ETH
    const priceMultiplicator = 2;

    const Toxel = await ethers.getContractFactory("Toxel");
    const toxel = await Toxel.deploy(initialPrice, priceMultiplicator, fundAddress.address);

    return { toxel, owner, addr1, addr2, fundAddress, initialPrice, priceMultiplicator };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { toxel, owner } = await loadFixture(deployToxelFixture);
      expect(await toxel.owner()).to.equal(owner.address);
    });

    it("Should set the initial price correctly", async function () {
      const { toxel, initialPrice } = await loadFixture(deployToxelFixture);
      expect(await toxel.initialPrice()).to.equal(initialPrice);
    });

    it("Should set the price multiplicator correctly", async function () {
      const { toxel, priceMultiplicator } = await loadFixture(deployToxelFixture);
      expect(await toxel.priceMultiplicator()).to.equal(priceMultiplicator);
    });

    it("Should set the fund address correctly", async function () {
      const { toxel, fundAddress } = await loadFixture(deployToxelFixture);
      expect(await toxel.fundAddress()).to.equal(fundAddress.address);
    });

    it("Should have correct grid size constants", async function () {
      const { toxel } = await loadFixture(deployToxelFixture);
      expect(await toxel.GRID_SIZE()).to.equal(100);
      expect(await toxel.MAX_COORDINATE()).to.equal(99);
    });
  });

  describe("Pixel Management", function () {
    describe("Getting pixel information", function () {
      it("Should return zero address for unowned pixels", async function () {
        const { toxel } = await loadFixture(deployToxelFixture);
        expect(await toxel.getPixelOwner(50, 50)).to.equal(ethers.ZeroAddress);
      });

      it("Should return initial price for unowned pixels", async function () {
        const { toxel, initialPrice } = await loadFixture(deployToxelFixture);
        expect(await toxel.getPixelPrice(50, 50)).to.equal(initialPrice);
      });

      it("Should return empty color for unowned pixels", async function () {
        const { toxel } = await loadFixture(deployToxelFixture);
        expect(await toxel.getPixelColor(50, 50)).to.equal("0x000000");
      });
    });

    describe("Coordinate validation", function () {
      it("Should reject coordinates at MAX_COORDINATE", async function () {
        const { toxel, initialPrice } = await loadFixture(deployToxelFixture);
        const color = "0xff0000"; // Red

        await expect(
          toxel.claimPixel(99, 99, color, { value: initialPrice })
        ).to.be.revertedWith("x coordinate is out of grid");
      });

      it("Should reject coordinates above MAX_COORDINATE", async function () {
        const { toxel, initialPrice } = await loadFixture(deployToxelFixture);
        const color = "0xff0000"; // Red

        await expect(
          toxel.claimPixel(100, 50, color, { value: initialPrice })
        ).to.be.revertedWith("x coordinate is out of grid");
      });

      it("Should accept valid coordinates", async function () {
        const { toxel, addr1, initialPrice, fundAddress } = await loadFixture(deployToxelFixture);
        const color = "0xff0000"; // Red

        await expect(
          toxel.connect(addr1).claimPixel(50, 50, color, { value: initialPrice })
        ).to.not.be.reverted;
      });
    });
  });

  describe("Claiming Pixels", function () {
    describe("First time pixel purchase", function () {
      it("Should allow buying an unowned pixel with correct price", async function () {
        const { toxel, addr1, initialPrice, fundAddress } = await loadFixture(deployToxelFixture);
        const color = "0xff0000"; // Red

        const fundBalanceBefore = await ethers.provider.getBalance(fundAddress.address);

        await expect(
          toxel.connect(addr1).claimPixel(50, 50, color, { value: initialPrice })
        ).to.emit(toxel, "PixelBought")
          .withArgs(addr1.address, 50n, 50n, initialPrice)
          .and.to.emit(toxel, "PixelChanged")
          .withArgs(addr1.address, 50n, 50n, color);

        expect(await toxel.getPixelOwner(50, 50)).to.equal(addr1.address);
        expect(await toxel.getPixelColor(50, 50)).to.equal(color);
        expect(await toxel.getPixelPrice(50, 50)).to.equal(initialPrice * 2n);

        const fundBalanceAfter = await ethers.provider.getBalance(fundAddress.address);
        expect(fundBalanceAfter - fundBalanceBefore).to.equal(initialPrice);
      });

      it("Should reject purchase with incorrect payment", async function () {
        const { toxel, addr1, initialPrice } = await loadFixture(deployToxelFixture);
        const color = "0xff0000"; // Red
        const wrongPrice = initialPrice / 2n;

        await expect(
          toxel.connect(addr1).claimPixel(50, 50, color, { value: wrongPrice })
        ).to.be.revertedWith("msg.value should be exact pixel price");
      });

      it("Should reject purchase with overpayment", async function () {
        const { toxel, addr1, initialPrice } = await loadFixture(deployToxelFixture);
        const color = "0xff0000"; // Red
        const overpayment = initialPrice * 2n;

        await expect(
          toxel.connect(addr1).claimPixel(50, 50, color, { value: overpayment })
        ).to.be.revertedWith("msg.value should be exact pixel price");
      });
    });

    describe("Buying from another owner", function () {
      beforeEach(async function () {
        const { toxel, addr1, initialPrice } = await loadFixture(deployToxelFixture);
        const color = "0xff0000"; // Red
        
        // First user buys the pixel
        await toxel.connect(addr1).claimPixel(50, 50, color, { value: initialPrice });
      });

      it("Should allow buying pixel from another owner", async function () {
        const { toxel, addr1, addr2, initialPrice } = await loadFixture(deployToxelFixture);
        
        // First user buys the pixel
        const color1 = "0xff0000"; // Red
        await toxel.connect(addr1).claimPixel(50, 50, color1, { value: initialPrice });
        
        const newPrice = initialPrice * 2n;
        const color2 = "0x00ff00"; // Green
        
        const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

        await expect(
          toxel.connect(addr2).claimPixel(50, 50, color2, { value: newPrice })
        ).to.emit(toxel, "PixelDividends")
          .withArgs(addr1.address, 50n, 50n, newPrice)
          .and.to.emit(toxel, "PixelBought")
          .withArgs(addr2.address, 50n, 50n, newPrice)
          .and.to.emit(toxel, "PixelChanged")
          .withArgs(addr2.address, 50n, 50n, color2);

        expect(await toxel.getPixelOwner(50, 50)).to.equal(addr2.address);
        expect(await toxel.getPixelColor(50, 50)).to.equal(color2);
        expect(await toxel.getPixelPrice(50, 50)).to.equal(newPrice * 2n);

        const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
        expect(addr1BalanceAfter - addr1BalanceBefore).to.equal(newPrice);
      });

      it("Should reject purchase with wrong price", async function () {
        const { toxel, addr1, addr2, initialPrice } = await loadFixture(deployToxelFixture);
        
        // First user buys the pixel
        const color1 = "0xff0000"; // Red
        await toxel.connect(addr1).claimPixel(50, 50, color1, { value: initialPrice });
        
        const wrongPrice = initialPrice; // Should be double
        const color2 = "0x00ff00"; // Green

        await expect(
          toxel.connect(addr2).claimPixel(50, 50, color2, { value: wrongPrice })
        ).to.be.revertedWith("msg.value should be exact pixel price");
      });
    });

    describe("Owner changing pixel color", function () {
      it("Should allow owner to change color without payment", async function () {
        const { toxel, addr1, initialPrice } = await loadFixture(deployToxelFixture);
        
        // First buy the pixel
        const color1 = "0xff0000"; // Red
        await toxel.connect(addr1).claimPixel(50, 50, color1, { value: initialPrice });
        
        // Change color without payment
        const color2 = "0x00ff00"; // Green
        await expect(
          toxel.connect(addr1).claimPixel(50, 50, color2, { value: 0 })
        ).to.emit(toxel, "PixelChanged")
          .withArgs(addr1.address, 50n, 50n, color2);

        expect(await toxel.getPixelColor(50, 50)).to.equal(color2);
        expect(await toxel.getPixelOwner(50, 50)).to.equal(addr1.address);
        // Price should remain the same
        expect(await toxel.getPixelPrice(50, 50)).to.equal(initialPrice * 2n);
      });

      it("Should reject owner payment when changing color", async function () {
        const { toxel, addr1, initialPrice } = await loadFixture(deployToxelFixture);
        
        // First buy the pixel
        const color1 = "0xff0000"; // Red
        await toxel.connect(addr1).claimPixel(50, 50, color1, { value: initialPrice });
        
        // Try to change color with payment
        const color2 = "0x00ff00"; // Green
        await expect(
          toxel.connect(addr1).claimPixel(50, 50, color2, { value: initialPrice })
        ).to.be.revertedWith("User should not pay for changing own pixel");
      });

      it("Should not emit PixelChanged if color is the same", async function () {
        const { toxel, addr1, initialPrice } = await loadFixture(deployToxelFixture);
        
        // First buy the pixel
        const color = "0xff0000"; // Red
        await toxel.connect(addr1).claimPixel(50, 50, color, { value: initialPrice });
        
        // Try to set the same color
        await expect(
          toxel.connect(addr1).claimPixel(50, 50, color, { value: 0 })
        ).to.not.emit(toxel, "PixelChanged");
      });
    });
  });

  describe("Admin Functions", function () {
    describe("Price multiplicator", function () {
      it("Should allow owner to change price multiplicator", async function () {
        const { toxel, owner } = await loadFixture(deployToxelFixture);
        
        await toxel.connect(owner).setPriceMultiplicator(3);
        expect(await toxel.priceMultiplicator()).to.equal(3);
      });

      it("Should reject non-owner changing price multiplicator", async function () {
        const { toxel, addr1 } = await loadFixture(deployToxelFixture);
        
        await expect(
          toxel.connect(addr1).setPriceMultiplicator(3)
        ).to.be.revertedWithCustomError(toxel, "OwnableUnauthorizedAccount");
      });

      it("Should affect future pixel purchases", async function () {
        const { toxel, owner, addr1, addr2, initialPrice } = await loadFixture(deployToxelFixture);
        
        // Change multiplicator to 3
        await toxel.connect(owner).setPriceMultiplicator(3);
        
        // First user buys pixel
        const color1 = "0xff0000";
        await toxel.connect(addr1).claimPixel(50, 50, color1, { value: initialPrice });
        
        // Check that price is multiplied by 3
        expect(await toxel.getPixelPrice(50, 50)).to.equal(initialPrice * 3n);
        
        // Second user buys from first user
        const newPrice = initialPrice * 3n;
        const color2 = "0x00ff00";
        await toxel.connect(addr2).claimPixel(50, 50, color2, { value: newPrice });
        
        // Check that price is again multiplied by 3
        expect(await toxel.getPixelPrice(50, 50)).to.equal(newPrice * 3n);
      });
    });

    describe("Fund address", function () {
      it("Should allow owner to change fund address", async function () {
        const { toxel, owner, addr1 } = await loadFixture(deployToxelFixture);
        
        await toxel.connect(owner).setFundAddress(addr1.address);
        expect(await toxel.fundAddress()).to.equal(addr1.address);
      });

      it("Should reject non-owner changing fund address", async function () {
        const { toxel, addr1, addr2 } = await loadFixture(deployToxelFixture);
        
        await expect(
          toxel.connect(addr1).setFundAddress(addr2.address)
        ).to.be.revertedWithCustomError(toxel, "OwnableUnauthorizedAccount");
      });

      it("Should send initial purchases to new fund address", async function () {
        const { toxel, owner, addr1, addr2, initialPrice } = await loadFixture(deployToxelFixture);
        
        // Change fund address
        await toxel.connect(owner).setFundAddress(addr2.address);
        
        const balanceBefore = await ethers.provider.getBalance(addr2.address);
        
        // Buy pixel (should go to new fund address)
        const color = "0xff0000";
        await toxel.connect(addr1).claimPixel(50, 50, color, { value: initialPrice });
        
        const balanceAfter = await ethers.provider.getBalance(addr2.address);
        expect(balanceAfter - balanceBefore).to.equal(initialPrice);
      });
    });

    describe("Initial price", function () {
      it("Should allow owner to change initial price", async function () {
        const { toxel, owner } = await loadFixture(deployToxelFixture);
        
        const newPrice = ethers.parseEther("0.02");
        await toxel.connect(owner).setInitialPrice(newPrice);
        expect(await toxel.initialPrice()).to.equal(newPrice);
      });

      it("Should reject non-owner changing initial price", async function () {
        const { toxel, addr1 } = await loadFixture(deployToxelFixture);
        
        const newPrice = ethers.parseEther("0.02");
        await expect(
          toxel.connect(addr1).setInitialPrice(newPrice)
        ).to.be.revertedWithCustomError(toxel, "OwnableUnauthorizedAccount");
      });

      it("Should affect price of unowned pixels", async function () {
        const { toxel, owner, addr1 } = await loadFixture(deployToxelFixture);
        
        const newPrice = ethers.parseEther("0.02");
        await toxel.connect(owner).setInitialPrice(newPrice);
        
        // Check that unowned pixel has new price
        expect(await toxel.getPixelPrice(50, 50)).to.equal(newPrice);
        
        // Buy pixel with new price
        const color = "0xff0000";
        await expect(
          toxel.connect(addr1).claimPixel(50, 50, color, { value: newPrice })
        ).to.not.be.reverted;
      });
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle multiple purchases of the same pixel", async function () {
      const { toxel, addr1, addr2, initialPrice, fundAddress } = await loadFixture(deployToxelFixture);
      
      const color1 = "0xff0000";
      const color2 = "0x00ff00";
      const color3 = "0x0000ff";
      
      // First purchase
      await toxel.connect(addr1).claimPixel(50, 50, color1, { value: initialPrice });
      expect(await toxel.getPixelPrice(50, 50)).to.equal(initialPrice * 2n);
      
      // Second purchase
      const price2 = initialPrice * 2n;
      await toxel.connect(addr2).claimPixel(50, 50, color2, { value: price2 });
      expect(await toxel.getPixelPrice(50, 50)).to.equal(price2 * 2n);
      
      // Third purchase back to addr1
      const price3 = price2 * 2n;
      await toxel.connect(addr1).claimPixel(50, 50, color3, { value: price3 });
      expect(await toxel.getPixelPrice(50, 50)).to.equal(price3 * 2n);
      
      expect(await toxel.getPixelOwner(50, 50)).to.equal(addr1.address);
      expect(await toxel.getPixelColor(50, 50)).to.equal(color3);
    });

    it("Should handle zero value color changes correctly", async function () {
      const { toxel, addr1, initialPrice } = await loadFixture(deployToxelFixture);
      
      // Buy pixel
      const color1 = "0xff0000";
      await toxel.connect(addr1).claimPixel(50, 50, color1, { value: initialPrice });
      
      // Change to zero color
      const color2 = "0x000000";
      await expect(
        toxel.connect(addr1).claimPixel(50, 50, color2, { value: 0 })
      ).to.emit(toxel, "PixelChanged")
        .withArgs(addr1.address, 50n, 50n, color2);
      
      expect(await toxel.getPixelColor(50, 50)).to.equal(color2);
    });

    it("Should maintain correct state across multiple pixels", async function () {
      const { toxel, addr1, addr2, initialPrice } = await loadFixture(deployToxelFixture);
      
      const color1 = "0xff0000";
      const color2 = "0x00ff00";
      
      // Buy different pixels
      await toxel.connect(addr1).claimPixel(10, 10, color1, { value: initialPrice });
      await toxel.connect(addr2).claimPixel(20, 20, color2, { value: initialPrice });
      
      // Verify independent state
      expect(await toxel.getPixelOwner(10, 10)).to.equal(addr1.address);
      expect(await toxel.getPixelOwner(20, 20)).to.equal(addr2.address);
      expect(await toxel.getPixelColor(10, 10)).to.equal(color1);
      expect(await toxel.getPixelColor(20, 20)).to.equal(color2);
      expect(await toxel.getPixelPrice(10, 10)).to.equal(initialPrice * 2n);
      expect(await toxel.getPixelPrice(20, 20)).to.equal(initialPrice * 2n);
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should not emit PixelChanged for same color", async function () {
      const { toxel, addr1, initialPrice } = await loadFixture(deployToxelFixture);
      
      const color = "0xff0000";
      
      // First purchase
      await toxel.connect(addr1).claimPixel(50, 50, color, { value: initialPrice });
      
      // Try to buy with same color (should not emit PixelChanged)
      const newPrice = initialPrice * 2n;
      await expect(
        toxel.connect(addr1).claimPixel(50, 50, color, { value: 0 })
      ).to.not.emit(toxel, "PixelChanged");
    });
  });
});