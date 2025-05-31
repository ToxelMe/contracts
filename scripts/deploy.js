const { ethers } = require("hardhat")
require('dotenv').config();

async function main() {
    const Toxel = await ethers.getContractFactory("Toxel")
    const toxel = await Toxel.deploy(1000000000000000, 2, "0x27D778cFE54180B95393DDD585399231a2E3FDFE")

    const contractAddress = await toxel.getAddress()
    console.log('Contract deployed to: ', contractAddress)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });