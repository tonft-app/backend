import { Telegraf } from 'telegraf';
import axios from 'axios';

import fs from 'fs';
import { pipeline } from "stream/promises";

const IMAGE_PATH = process.env.BOT_IMAGE_PATH;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const bot = new Telegraf(BOT_TOKEN!);

export const round = (value: number, precision: number): number => {
  return Math.round(10 ** precision * value) / 10 ** precision;
};

async function getNftInfo(nftAddress: string) {
  const request = await axios.get(`https://tonapi.io/v1/nft/getItems?addresses=${nftAddress}`)
  const collectionName = request.data.nft_items[0].collection.name;
  const itemName = request.data.nft_items[0].metadata.name;
  const itemDescription = request.data.nft_items[0].metadata.description;
  const imageUrl = request.data.nft_items[0].metadata.image;

  return { collectionName, itemName, itemDescription, imageUrl };
}

async function getImage(nftUrl: string) {
  // If protocol is ipfs
  if (nftUrl.startsWith("ipfs://")) {
    nftUrl = "https://ipfs.io/ipfs/" + nftUrl.split("ipfs://")[1];
  }

  const response = await axios({
    url: nftUrl,
    method: "GET",
    responseType: "stream",
  });

  if (!response.headers["content-type"]) {
    return;
  }

  const ext = response.headers["content-type"].split("/")[1];

  if (ext !== "png" && ext !== "jpg" && ext !== "jpeg") {
    return;
  }

  const writer = fs.createWriteStream(IMAGE_PATH! + "test." + ext);

  try {
    await pipeline(response.data, writer);
  } catch (err) {
    console.error(`Failed to download image: ${err}`);
    writer.destroy();
    return;
  }

  return "test." + ext;
}

export function createMessageText(
  contractAddress: string,
  nftAddress: string,
  salePrice: string,
  ownerAddress: string,
  itemInfo: any,
  type: string
) {
  const { collectionName, itemName, itemDescription, imageUrl } = itemInfo;
  const link = 'https://tonft.app/getOffer?owner=' + ownerAddress + '&nftItem=' + nftAddress + '&saleContractAddress=' + contractAddress;

  if (type === "new") {
    return `<b>🔖 <a href="${imageUrl}">New offer</a></b>
<b>Item:</b> ${itemName}
<b>Collection:</b> ${collectionName}
<b>Description:</b> ${itemDescription}
<a href="https://tonscan.org/address/${nftAddress}">NFT</a> | <a href="https://tonscan.org/address/${contractAddress}">Sale contract</a> 
Sale price: <a>${round(Number.parseFloat(salePrice), 2)}</a> 💎
<a href="${link}"><b>Buy now</b></a>`;
  } else {
    return `<b>🔖 <a href="${imageUrl}">New sale!</a></b>
<b>Item:</b> ${itemName}
<b>Collection:</b> ${collectionName}
<a href="https://tonscan.org/address/${nftAddress}">NFT</a> | <a href="https://tonscan.org/address/${contractAddress}">Sale contract</a> 
Sale price: <a>${round(Number.parseFloat(salePrice), 2)}</a> 💎`;

  }
}

export async function sendMessageToChannel(contractAddress: string, nftAddress: string, salePrice: string, ownerAddress: string, type = "new") {
  try {
    const itemInfo = await getNftInfo(nftAddress);
    const image = await getImage(itemInfo.imageUrl);

    if (!image || image.length === 0) {
      await bot.telegram.sendMessage(CHANNEL_ID!, createMessageText(contractAddress, nftAddress, salePrice, ownerAddress, itemInfo, type), { parse_mode: 'HTML' });
    } else {
      const imageBinary = fs.readFileSync(IMAGE_PATH! + image);

      await bot.telegram.sendPhoto(CHANNEL_ID!, { source: imageBinary }, { caption: createMessageText(contractAddress, nftAddress, salePrice, ownerAddress, itemInfo, type), parse_mode: 'HTML' });
    }
  } catch {
    console.log("Error while sending message to channel", contractAddress, nftAddress, salePrice, ownerAddress);
  }
}
