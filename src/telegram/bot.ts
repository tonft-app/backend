import { Telegraf } from 'telegraf';
import axios from 'axios';
import fs from 'fs';
import { pipeline } from 'stream/promises';

const IMAGE_PATH = process.env.BOT_IMAGE_PATH;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const bot = new Telegraf(BOT_TOKEN!);

const fetchNftInfo = async (nftAddress: string) => {
  const request = await axios.get(`https://tonapi.io/v1/nft/getItems?addresses=${nftAddress}`);
  const { collection, metadata } = request.data.nft_items[0];

  return {
    collectionName: collection.name,
    itemName: metadata.name,
    itemDescription: metadata.description,
    imageUrl: metadata.image,
  };
};

const downloadImage = async (nftUrl: string) => {
  if (nftUrl.startsWith('ipfs://')) {
    nftUrl = `https://ipfs.io/ipfs/${nftUrl.split('ipfs://')[1]}`;
  }

  const response = await axios.get(nftUrl, { responseType: 'stream' });
  const contentType = response.headers['content-type'];
  const ext = contentType?.split('/')[1];

  if (!ext || !['png', 'jpg', 'jpeg'].includes(ext)) {
    return;
  }

  const filePath = `${IMAGE_PATH!}test.${ext}`;
  const writer = fs.createWriteStream(filePath);

  try {
    await pipeline(response.data, writer);
  } catch (err) {
    console.error(`Failed to download image: ${err}`);
    writer.destroy();
    return;
  }

  return `test.${ext}`;
};

const createMessageText = (params: {
  contractAddress: string;
  nftAddress: string;
  salePrice: string;
  ownerAddress: string;
  collectionName: string;
  itemName: string;
  itemDescription: string;
  imageUrl: string;
  type: string;
  hash: string;
}) => {
  const {
    contractAddress,
    nftAddress,
    salePrice,
    ownerAddress,
    collectionName,
    itemName,
    itemDescription,
    imageUrl,
    type,
    hash,
  } = params;
  const link = `https://tonft.app/offer/${hash}`;
  const formattedPrice = Number.parseFloat(salePrice).toFixed(2);

  if (type === 'new') {
    return `<b>🔖 <a href="${link}">New offer</a></b>
<b>Item:</b> ${itemName}
<b>Collection:</b> ${collectionName}
<a href="https://tonscan.org/address/${nftAddress}">NFT</a> | <a href="https://tonscan.org/address/${contractAddress}">Sale contract</a>
<a href="${link}"><b>Buy now for ${formattedPrice} TON</b></a>`;
  } else {
    return `<b>👑 <a href="${link}">ITEM SOLD</a></b>
<b>Item:</b> ${itemName}
<a href="https://tonscan.org/address/${nftAddress}">NFT</a> | <a href="https://tonscan.org/address/${contractAddress}">Sale contract</a>
Sale price: <a>${formattedPrice}</a> 💎`;
  }
};

export const sendMessageToChannel = async (
  contractAddress: string,
  nftAddress: string,
  salePrice: string,
  ownerAddress: string,
  type = 'new',
  hash = '',
) => {
  const {
    collectionName,
    itemName,
    itemDescription,
    imageUrl,
  } = await fetchNftInfo(nftAddress);
  const imageFile = await downloadImage(imageUrl);

  const messageParams = {
    contractAddress,
    nftAddress,
    salePrice,
    ownerAddress,
    collectionName,
    itemName,
    itemDescription,
    imageUrl,
    type,
    hash,
  };

  if (!imageFile) {
    const text = createMessageText(messageParams);
    await bot.telegram.sendMessage(CHANNEL_ID!, text, { parse_mode: 'HTML' });
  } else {
    const imageBinary = fs.readFileSync(`${IMAGE_PATH!}${imageFile}`);
    await bot.telegram.sendPhoto(CHANNEL_ID!, { source: imageBinary }, {
      caption: createMessageText(messageParams),
      parse_mode: 'HTML',
    });
  }
};
