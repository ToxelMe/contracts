// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Toxel is Ownable, ReentrancyGuard {

    uint256 public constant GRID_SIZE = 100;
    uint256 public constant MAX_COORDINATE = GRID_SIZE - 1;

    uint256 public initialPrice;
    uint256 public priceMultiplicator;
    
    address payable public fundAddress;

    struct Pixel {
        address owner;
        uint256 price;
        string color;
    }

    mapping (uint256 => mapping (uint256 => address)) private _pixelOwners;
    mapping (uint256 => mapping (uint256 => uint256)) private _pixelPrice;
    mapping (uint256 => mapping (uint256 => bytes3)) private _pixelColor;

    event PixelChanged(address indexed newOwner, uint256 x, uint256 y, bytes3 color);
    event PixelBought(address indexed owner, uint256 x, uint256 y, uint256 amount);
    event PixelDividends(address indexed owner, uint256 x, uint256 y, uint256 amount);

    constructor(uint256 _initPrice, uint256 _priceMultiplicator, address payable _fundAddress) Ownable (msg.sender) {
        initialPrice = _initPrice;
        priceMultiplicator = _priceMultiplicator;
        fundAddress = _fundAddress;
    }

    function claimPixel(uint256 x, uint256 y, bytes3 color) nonReentrant external payable {
        require(x < MAX_COORDINATE, "x coordinate is out of grid");
        require(y < MAX_COORDINATE, "y coordinate is out of grid");

        address pixelOwner = getPixelOwner(x, y);

        if (msg.sender == pixelOwner) {
            require(msg.value == 0, "User should not pay for changing own pixel");

            // owner can change pixel color without payment
            if (color != getPixelColor(x, y)) {
                _pixelColor[x][y] = color;
                emit PixelChanged(msg.sender, x, y, color);
            }
        } else {
            uint256 currentPixelPrice = getPixelPrice(x, y);

            // otherwise, new owner should buy pixel
            require(msg.value == currentPixelPrice, "msg.value should be exact pixel price");
            
            if (pixelOwner != address(0)) {
                // send funds to previous owner. Potential re-entrancy
                payable(pixelOwner).call{value: currentPixelPrice}("");
                emit PixelDividends(pixelOwner, x, y, currentPixelPrice);
            } else {
                fundAddress.call{value: currentPixelPrice}("");
            }

            // update pixel details
            _pixelPrice[x][y] = currentPixelPrice * priceMultiplicator;
            _pixelOwners[x][y] = msg.sender;

            if (getPixelColor(x, y) != color) {
                _pixelColor[x][y] = color;
                emit PixelChanged(msg.sender, x, y, color);
            }

            emit PixelBought(msg.sender, x, y, currentPixelPrice);
        }
    }

    function setPriceMultiplicator(uint256 _priceMultiplicator) public onlyOwner() {
        priceMultiplicator = _priceMultiplicator;
    }

    function setFundAddress(address payable _fundAddress) public onlyOwner {
        fundAddress = _fundAddress;
    }

    function setInitialPrice(uint256 _initialPrice) public onlyOwner() {
        initialPrice = _initialPrice;
    }

    function getPixelOwner(uint256 x, uint256 y) public view returns (address) {
        return _pixelOwners[x][y];
    } 

    function getPixelColor(uint256 x, uint256 y) public view returns (bytes3) {
        return _pixelColor[x][y];
    } 

    function getPixelPrice(uint256 x, uint256 y) public view returns (uint256) {
        if (getPixelOwner(x, y) == address(0)) {
            return initialPrice;
        }

        return _pixelPrice[x][y];
    } 
}