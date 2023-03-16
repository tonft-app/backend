import { createCancelLink, createTransferLink, createSaleLink, createBuyLink } from "../tonkeeper/tonkeeperLinks";
import { getContractState, isNftTransfered, userFriendlyAddress } from "../toncenter/toncenterApi";
import { calculateStatistics, getContractAddress } from "../utils/utils";
import { getNftItems, getNftsByUserAddress } from "../tonapi/tonapiApi";
import { NextFunction, Request, Response } from "express";
import { sendMessageToChannel } from "../telegram/bot";
import { getRoyaltyParams } from "../tonnft/tonnft";
import { Address } from "ton";
import {
  changeStatusOfOrderBySaleContractAddress,
  insertIntoReferralBonusTable,
  getAllActiveAndSoldOffers,
  insertIntoOrders,
  getOrderByHash,
  getOrders,
  getOrderBySaleContractAddress,
} from "../db/db";

const getAllOffers = async (req: Request, res: Response, next: NextFunction) => {
  let activeAndSoldOffers = await getAllActiveAndSoldOffers();

  if (activeAndSoldOffers.length === 0) {
    return res.status(200).json({
      message: "No active orders",
    });
  }
  let itemsData = await getNftItems(activeAndSoldOffers.map((order) => order.nft_item_address).join(","));

  const unifiedData = activeAndSoldOffers.map((order, _) => {
    const item = itemsData.find((item: any) => {
      const address = Address.parseRaw(item.address).toFriendly();
      return address === order.nft_item_address
    }
    );
    return {
      ...order,
      ...item,
    };
  });

  const statistics = await calculateStatistics();

  const soldOrders = unifiedData.filter((order) => order.status === "sold");
  const activeOrders = unifiedData.filter((order) => order.status === "active");


  return res.status(200).json({
    activeOrders: activeOrders,
    soldOrders: soldOrders,
    statistics
  });
};

const getOffer = async (req: Request, res: Response, next: NextFunction) => {
  let nftItemAddress = req.query.nftItemAddress;
  let ownerAddress = req.query.ownerAddress;
  let saleContractAddress = req.query.saleContractAddress;


  if (!nftItemAddress) {
    return res.status(400).json({
      message: "nftItemAddress is required",
    });
  }

  if (!ownerAddress) {
    return res.status(400).json({
      message: "ownerAddress is required",
    });
  }

  if (!saleContractAddress) {
    return res.status(400).json({
      message: "saleContractAddress is required",
    });
  }

  saleContractAddress = saleContractAddress.toString();
  nftItemAddress = nftItemAddress.toString();
  ownerAddress = ownerAddress.toString();

  const orders = await getOrders(nftItemAddress, ownerAddress, saleContractAddress);

  if (orders.length === 0) {
    return res.status(404).json({
      error: "No active orders",
    });
  }

  const order = orders[0];
  const cancelLink = createCancelLink(order.owner_address, order.contract_address);

  const buyLink = createBuyLink(order.contract_address, order.price, "0");

  return res.status(200).json({
    order,
    cancelLink,
    buyLink
  });
}

const getInitLink = async (req: Request, res: Response, next: NextFunction) => {
  let nftItemAddress = req.query.nftItemAddress;
  let fullPrice = req.query.fullPrice;
  let royaltyPercent = req.query.royaltyPercent;
  let royaltyAddress = req.query.royaltyAddress;
  let refPercent = req.query.refPercent;

  if (!nftItemAddress) {
    return res.status(400).json({
      message: "contractAddress is required",
    });
  }

  if (!fullPrice) {
    return res.status(400).json({
      message: "fullPrice is required",
    });
  }

  if (isNaN(Number.parseFloat(fullPrice.toString()))) {
    return res.status(400).json({
      message: "fullPrice should be a number",
    });
  }

  if (!royaltyPercent) {
    return res.status(400).json({
      message: "royaltyPercent is required",
    });
  }

  if (isNaN(Number.parseFloat(royaltyPercent.toString()))) {
    return res.status(400).json({

      message: "royaltyPercent should be a number",

    });
  }

  if (!royaltyAddress) {
    return res.status(400).json({
      message: "royaltyAddress is required",
    });
  }

  if (!refPercent) {
    return res.status(400).json({
      message: "ref_percent is required",
    });
  }

  try {
    if (Number.parseFloat(fullPrice.toString()) < 1) {
      return res.status(400).json({
        message: "fullPrice should be more than 1",
      });
    }
  } catch (e) {
    return res.status(400).json({
      message: "fullPrice should be a number",
    });
  }

  nftItemAddress = nftItemAddress.toString();
  fullPrice = fullPrice.toString();
  royaltyPercent = royaltyPercent.toString();
  royaltyAddress = royaltyAddress.toString();
  refPercent = refPercent.toString();

  const link = createSaleLink(nftItemAddress, fullPrice, royaltyPercent, royaltyAddress, refPercent);

  return res.status(200).json({
    link,
  });
}


const checkInit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let ownerAddress = req.query.ownerAddress;
    let createdAt = req.query.createdAt;

    if (!ownerAddress) {
      return res.status(400).json({
        message: "ownerAddress is required",
      });
    }

    if (!createdAt) {
      return res.status(400).json({
        message: "createdAt is required",
      });
    }

    if (isNaN(Number.parseInt(createdAt.toString()))) {
      return res.status(400).json({
        message: "createdAt should be a number",
      });
    }

    ownerAddress = ownerAddress.toString();
    createdAt = createdAt.toString();
    const contractAddress = await getContractAddress(ownerAddress, createdAt);

    if (!contractAddress) {
      return res.status(200).json({
        initialized: false,
      });
    }

    return res.status(200).json({
      initialized: true,
      contractAddress,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

const getTransferLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let contractAddress = req.query.contractAddress;
    let nftItemAddress = req.query.nftItemAddress;

    if (!contractAddress) {
      return res.status(400).json({
        message: "contractAddress is required",
      });
    }

    if (!nftItemAddress) {
      return res.status(400).json({
        message: "nftItemAddress is required",
      });
    }

    contractAddress = contractAddress.toString();
    nftItemAddress = nftItemAddress.toString();

    const link = createTransferLink(contractAddress, nftItemAddress);
    return res.status(200).json({
      link,
    });


  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

const checkTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let contractAddress = req.query.contractAddress;
    let nftItemAddress = req.query.nftItemAddress;
    let ownerAddress = req.query.ownerAddress;
    let price = req.query.price;
    let royaltyPercent = req.query.royaltyPercent;
    let royaltyAddress = req.query.royaltyAddress;
    let refPercent = req.query.refPercent;
    let hash = req.query.hash;

    if (!contractAddress) {
      return res.status(400).json({
        message: "contractAddress is required",
      });
    }

    if (!nftItemAddress) {
      return res.status(400).json({
        message: "nftItemAddress is required",
      });
    }

    if (!ownerAddress) {
      return res.status(400).json({
        message: "ownerAddress is required",
      });
    }

    if (!price) {
      return res.status(400).json({
        message: "price is required",
      });
    }

    if (!royaltyPercent) {
      return res.status(400).json({
        message: "royaltyPercent is required",
      });
    }

    if (!royaltyAddress) {
      return res.status(400).json({
        message: "royaltyAddress is required",
      });
    }

    if (!refPercent) {
      return res.status(400).json({
        message: "refPercent is required",
      });
    }

    if (!hash) {
      return res.status(400).json({
        message: "hash is required",
      });
    }

    contractAddress = contractAddress.toString();
    nftItemAddress = nftItemAddress.toString();
    ownerAddress = ownerAddress.toString();
    price = price.toString();
    royaltyPercent = royaltyPercent.toString();
    royaltyAddress = royaltyAddress.toString();
    refPercent = refPercent.toString();
    hash = hash.toString();

    const transfered = await isNftTransfered(contractAddress, nftItemAddress);

    if (transfered) {
      console.log("transfered")
      const result = await insertIntoOrders(contractAddress, nftItemAddress, ownerAddress, price, 'active', royaltyPercent, royaltyAddress, refPercent, '', hash);


      console.log("result", result)
      if (result.error === null) {
        console.log("send message")
        await sendMessageToChannel(contractAddress, nftItemAddress, price, ownerAddress, "new", hash);
      }
    }


    return res.status(200).json({
      transfered,
      hash,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

const getUserNfts = async (req: Request, res: Response, next: NextFunction) => {
  let userAddress = req.query.userAddress;
  if (!userAddress) {
    return res.status(400).json({
      message: "userAddress is required",
    });
  }

  userAddress = userAddress.toString();

  const nfts = await getNftsByUserAddress(userAddress);

  nfts.forEach(async (nft: any) => {
    const contractAddress = nft?.sale?.address;
    const ownerAddress = nft?.sale?.owner?.address;

    if (!contractAddress || !ownerAddress) {
      return;
    }

    nft.cancelLink = createCancelLink(ownerAddress, contractAddress);
  });

  return res.status(200).json({
    nfts,
  });
}


const getCancelLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let ownerAddress = req.query.ownerAddress;
    let saleContractAddress = req.query.saleContractAddress;

    if (!ownerAddress) {
      return res.status(400).json({
        message: "ownerAddress is required",
      });
    }

    if (!saleContractAddress) {
      return res.status(400).json({
        message: "saleContractAddress is required",
      });
    }

    ownerAddress = ownerAddress.toString();
    saleContractAddress = saleContractAddress.toString();


    const cancelLink = createCancelLink(ownerAddress, saleContractAddress)

    return res.status(200).json({
      cancelLink,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

const getConfig = async (req: Request, res: Response, next: NextFunction) => {
  return res.status(200).json(
    {
      "url": "tonft.app",
      "name": "TONFT",
      "iconUrl": "https://telegra.ph/file/c7201eca05a8254d17d0b.png",
    }
  );
}


const checkForInactiveState = async (saleContractAddress: string) => {
  let i = 0;
  while (true) {
    console.log('checkForInactiveState', i)
    if (i > 6) {
      break;
    }

    const contractState = await getContractState(saleContractAddress);
    if (contractState.state === 'not active') {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 5 * 1000));

    i++;
  }

  return false;
}


const nftBuyCallbackHandler = async (req: Request, res: Response, next: NextFunction) => {
  console.log(req.query);

  const saleContractAddress = req.query.saleContractAddress;
  const fullPrice = req.query.fullPrice;
  const referral = req.query.referral;

  if (!saleContractAddress) {
    return res.status(400).json({
      message: "saleContractAddress is required",
    });
  }

  if (!fullPrice) {
    return res.status(400).json({
      message: "fullPrice is required",
    });
  }

  const saleContractAddressFormated = await userFriendlyAddress(saleContractAddress.toString());
  const actualBuy: boolean = await checkForInactiveState(saleContractAddressFormated);

  console.log('actualBuy', actualBuy)

  if (!actualBuy) {
    return res.status(500).json({
      message: "fake buy",
    });
  }

  await changeStatusOfOrderBySaleContractAddress(saleContractAddressFormated, 'sold');

  const order = await getOrderBySaleContractAddress(saleContractAddressFormated);
  if (order) {
    await sendMessageToChannel(
      order.contract_address,
      order.nft_item_address,
      order.price.toString(),
      order.owner_address,
      'sold'
    )
  }

  if (referral) {
    await insertIntoReferralBonusTable(referral.toString(), fullPrice.toString(), saleContractAddress.toString(), false);
  }

  return res.status(200).json({
    message: "success",
  });
}

const nftCancelCallbackHandler = async (req: Request, res: Response, next: NextFunction) => {
  const saleContractAddress = req.query.saleContractAddress;

  if (!saleContractAddress) {
    return res.status(400).json({
      message: "saleContractAddress is required",
    });
  }

  const saleContractAddressFormated = await userFriendlyAddress(saleContractAddress.toString());
  await changeStatusOfOrderBySaleContractAddress(saleContractAddressFormated, 'canceled');

  return res.status(200).json({
    message: "success",
  });
}


const callbackHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type;

    if (!type) {
      return res.status(400).json({
        message: "type is required",
      });
    }

    switch (type) {
      case 'nft-buy':
        console.log('nft-buy-loool')
        return nftBuyCallbackHandler(req, res, next);

      case 'nft-cancel':
        console.log('nft-cancel-loool')
        return nftCancelCallbackHandler(req, res, next);
    }
  }
  catch (error) {
    console.log(error);
  }
}

const getCollectionRoyalty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionAddress = req.query.collectionAddress;

    if (!collectionAddress) {
      return res.status(400).json({
        message: "collectionAddress is required",
      });
    }

    const collectionRoyalty = await getRoyaltyParams(collectionAddress.toString());

    return res.status(200).json({
      percent: collectionRoyalty.percent,
      destination: collectionRoyalty.destination,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

export const getOfferById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let orderHash = req.params.id;
    let referral = req.params.referral;

    if (!orderHash) {
      return res.status(400).json({
        message: "id in link is required",
      });
    }

    if (referral) {
      referral = referral.toString().replace('+', '-').replace('/', '_').split("").reverse().join("");
    }

    console.log(referral, "referral")

    orderHash = orderHash.toString();
    const order = await getOrderByHash(orderHash);

    if (order === null) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    console.log('order', order)
    const cancelLink = createCancelLink(order.owner_address, order.contract_address);
    const buyLink = createBuyLink(order.contract_address, order.price, referral);

    return res.status(200).json({
      order,
      cancelLink,
      buyLink
    });

  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

export default {
  getAllOffers,
  getOffer,
  getInitLink,
  checkInit,
  getTransferLink,
  checkTransfer,
  getUserNfts,
  getCancelLink,
  getConfig,
  callbackHandler,
  getCollectionRoyalty,
  getOfferById
};
