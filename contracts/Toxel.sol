// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Toxel is ERC721, Ownable {
    uint256 public nextTokenId; //id токна
    uint256 public totalSupply; //изначальное колво ток
    uint256 public maxPixels; //максимальное колво пикс 100
    uint256 public pixelPriceIncrementPercent; //процент
    uint256 public initPrice; //изначальная цена
    uint256 public pixelPrice; //конечная цена


    mapping(address => uint256) public userPixelCount;
    mapping(uint256 => string) private _pixelColors;

    event PixelPurchased(address indexed buyer, uint256 indexed tokenId, string color, uint256 value);

    constructor(uint256 _initPrice, uint256 _totalSupply, uint256 _maxPixels, uint256 _pixelPriceIncrementPercent) ERC721('Toxel', 'TXL') Ownable(msg.sender)
    {
        initPrice = _initPrice;
        nextTokenId = 1;
        totalSupply = _totalSupply;
        maxPixels = _maxPixels;
        pixelPriceIncrementPercent = _pixelPriceIncrementPercent;
    }

    function buyPixel(string memory color) external payable {
        require(msg.value == pixelPrice, "Incorrect payment amount");
        uint256 tokenId = nextTokenId;


        _safeMint(msg.sender, tokenId);
        _setPixelColor(tokenId, color);
        userPixelCount[msg.sender] += 1;
        totalSupply += 1;
        pixelPrice += (initPrice * pixelPriceIncrementPercent) / 100;

        emit PixelPurchased(msg.sender, tokenId, color, msg.value); 
    }

    function _setPixelColor(uint256 tokenId, string memory color) internal{
        //require(_exists(tokenId), "Token doesnt exist");
        _pixelColors[tokenId] = color;
    }
    
    function _getPixelColor(uint256 tokenId) external view returns(string memory){
        return _pixelColors[tokenId];
    }

    function setPixelPriceIncrement(uint256 _pixelPriceIncrementPercent) external onlyOwner {
        pixelPriceIncrementPercent = _pixelPriceIncrementPercent;
    }

    function check51PercentOwnership(address owner) public view returns (bool) {
        uint256 userOwnedPixels = userPixelCount[owner];
        uint256 totalOwnedPixels = totalSupply;

        return userOwnedPixels > (totalOwnedPixels * 51) / 100;
    }

    function _getTokenIdForOwner(address owner) internal view returns (uint256) {
        uint256 tokenId = 0;
        for (uint256 i = 1; i <= nextTokenId; i++) {
            if (ownerOf(i) == owner) {
                tokenId = i;
                break;
            }
        }
        return tokenId;
    }


}
//минт
//если ты владелец пиккселя можешь перекрасить бесплатно