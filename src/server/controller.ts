import { createCancelLink, createTransferLink, createSaleLink, createBuyLink } from "../tonkeeper/tonkeeperLinks";
import { getContractState, isNftTransfered, userFriendlyAddress } from "../toncenter/toncenterApi";
import { calculateStatistics, getContractAddress, toUserFriendlyAddress } from "../utils/utils";
import { getNftItems, getNftsByUserAddress } from "../tonapi/tonapiApi";
import { validationConfig, ValidationConfig } from "./validationConfig";
import { getRoyaltyParamsFromTonscan } from "../tonscan/tonscanApi";
import { getFloorDataForCollections } from "../getgems/getgemsApi";
import { NextFunction, Request, Response } from "express";
import { sendMessageToChannel } from "../telegram/bot";
import { Address } from "ton";
import {
  changeStatusOfOrderBySaleContractAddress,
  getOrderBySaleContractAddress,
  insertIntoReferralBonusTable,
  getAllActiveAndSoldOffers,
  insertIntoOrders,
  getOrderByHash,
  getOrders,
} from "../db/db";


const getConfig = async (req: Request, res: Response, next: NextFunction) => {
  return res.status(200).json(
    {
      "url": "tonft.app",
      "name": "TONFT",
      "iconUrl": "https://telegra.ph/file/c7201eca05a8254d17d0b.png",
    }
  );
}

const validateRequestFields = (req: Request, res: Response, validationConfig: ValidationConfig[]): boolean => {
  for (const config of validationConfig) {
    const fieldValue = req.query[config.fieldName];

    if (!config.validationFn(fieldValue)) {
      res.status(400).json({ message: config.errorMessage });
      return false;
    }
  }

  return true;
};

const getUnifiedData = async (activeAndSoldOffers: any[]) => {
  const itemsData = await getNftItems(activeAndSoldOffers.map((order) => order.nft_item_address).join(","));
  const floorData = await getFloorDataForCollections();

  return activeAndSoldOffers.map((order) => {
    const item = itemsData.find((item: any) => {
      const address = Address.parseRaw(item.address).toFriendly();
      return address === order.nft_item_address;
    });

    const floorPrice = floorData[
      toUserFriendlyAddress(item.collection_address)] === undefined ?
      0 : floorData[toUserFriendlyAddress(item.collection_address)
      ].floorPrice;

    return {
      ...order,
      ...item,
      floor_price: floorPrice,
    };
  });
};

const getAllOffers = async (req: Request, res: Response, next: NextFunction) => {
  const activeAndSoldOffers = await getAllActiveAndSoldOffers();

  if (activeAndSoldOffers.length === 0) {
    return res.status(200).json({
      message: "No active orders",
    });
  }

  const unifiedData = await getUnifiedData(activeAndSoldOffers);
  const statistics = await calculateStatistics();

  return res.status(200).json({
    activeOrders: unifiedData.filter((order) => order.status === "active"),
    soldOrders: unifiedData.filter((order) => order.status === "sold"),
    statistics,
  });
};


const getOffer = async (req: Request, res: Response, _: NextFunction) => {
  if (!validateRequestFields(req, res, validationConfig.getOffer)) {
    return;
  }

  const { nftItemAddress, ownerAddress, saleContractAddress } = req.query;
  const orders = await getOrders(
    nftItemAddress!.toString(),
    ownerAddress!.toString(),
    saleContractAddress!.toString()
  );

  if (orders.length === 0) {
    return res.status(404).json({ error: "No active orders" });
  }

  const order = orders[0];
  const cancelLink = createCancelLink(order.owner_address, order.contract_address);
  const buyLink = createBuyLink(order.contract_address, order.price, "0");

  return res.status(200).json({ order, cancelLink, buyLink });
};

const getInitLink = async (req: Request, res: Response, next: NextFunction) => {
  if (!validateRequestFields(req, res, validationConfig.getInitLink)) {
    return;
  }

  const { nftItemAddress, fullPrice, royaltyPercent, royaltyAddress, refPercent } = req.query;

  try {
    const ref = parseFloat(refPercent as string);
    const royalty = parseFloat(royaltyPercent as string);

    if (ref + royalty > 100 || ref < 2.5) {
      return res.status(400).json({
        message: "refPercent + royaltyPercent should be less than 100 and refPercent should be more than 2.5",
      });
    }
  } catch (e) {
    console.log("error", e);
  }

  const link = createSaleLink(
    nftItemAddress!.toString(),
    fullPrice!.toString(),
    royaltyPercent!.toString(),
    royaltyAddress!.toString(),
    refPercent!.toString()
  );

  return res.status(200).json({ link });
};

const checkInit = async (req: Request, res: Response, next: NextFunction) => {
  if (!validateRequestFields(req, res, validationConfig.checkInit)) {
    return;
  }

  try {
    const { ownerAddress, createdAt } = req.query;
    const contractAddress = await getContractAddress(ownerAddress!.toString(), createdAt!.toString());

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
  if (!validateRequestFields(req, res, validationConfig.getTransferLink)) {
    return;
  }

  try {
    const { contractAddress, nftItemAddress } = req.query;
    const link = createTransferLink(contractAddress!.toString(), nftItemAddress!.toString());
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
  if (!validateRequestFields(req, res, validationConfig.checkTransfer)) {
    return;
  }

  try {
    const {
      contractAddress,
      nftItemAddress,
      ownerAddress,
      price,
      royaltyPercent,
      royaltyAddress,
      refPercent,
      hash
    } = req.query;

    const transfered = await isNftTransfered(contractAddress!.toString(), nftItemAddress!.toString());

    if (transfered) {
      console.log("transfered");

      const ref = parseFloat(refPercent!.toString());
      const royalty = parseFloat(royaltyPercent!.toString());

      if (ref + royalty > 100) {
        return res.status(400).json({
          message: "refPercent + royaltyPercent should be less than 100",
        });
      }

      const result = await insertIntoOrders(
        contractAddress!.toString(),
        nftItemAddress!.toString(),
        ownerAddress!.toString(),
        price!.toString(),
        'active',
        royaltyPercent!.toString(),
        royaltyAddress!.toString(),
        refPercent!.toString(),
        '',
        hash!.toString()
      );

      console.log("result", result);
      if (result.error === null) {
        console.log("send message");
        await sendMessageToChannel(
          contractAddress!.toString(),
          nftItemAddress!.toString(),
          price!.toString(),
          ownerAddress!.toString(),
          "new",
          hash!.toString()
        );
      }
    }

    return res.status(200).json({
      transfered,
      hash: hash!.toString(),
    });

  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

const getUserNfts = async (req: Request, res: Response, next: NextFunction) => {
  if (!validateRequestFields(req, res, validationConfig.getUserNfts)) {
    return;
  }

  const { userAddress } = req.query;
  const nfts = await getNftsByUserAddress(userAddress!.toString());

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
  if (!validateRequestFields(req, res, validationConfig.getCancelLink)) {
    return;
  }

  const ownerAddress = req.query.ownerAddress!.toString();
  const saleContractAddress = req.query.saleContractAddress!.toString();

  const cancelLink = createCancelLink(ownerAddress, saleContractAddress);

  return res.status(200).json({
    cancelLink,
  });
};



const checkForInactiveState = async (saleContractAddress: string) => {
  for (let i = 0; i < 6; i++) {
    console.log('checkForInactiveState', i)
    const contractState = await getContractState(saleContractAddress);
    if (contractState.state === 'not active') {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
  }

  return false;
}


const nftBuyCallbackHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validateRequestFields(req, res, validationConfig.nftBuyCallbackHandler)) {
      return;
    }

    const saleContractAddress = req.query.saleContractAddress!.toString();
    const fullPrice = req.query.fullPrice;
    const referral = req.query.referral;

    const saleContractAddressFormatted = await userFriendlyAddress(saleContractAddress);
    const actualBuy: boolean = await checkForInactiveState(saleContractAddressFormatted);

    console.log("actualBuy", actualBuy);

    if (!actualBuy) {
      return res.status(500).json({
        message: "fake buy",
      });
    }

    await changeStatusOfOrderBySaleContractAddress(saleContractAddressFormatted, "sold");

    const order = await getOrderBySaleContractAddress(saleContractAddressFormatted);
    if (order) {
      await sendMessageToChannel(
        order.contract_address,
        order.nft_item_address,
        order.price.toString(),
        order.owner_address,
        "sold"
      );
    }

    if (referral) {
      await insertIntoReferralBonusTable(
        referral.toString(),
        fullPrice!.toString(),
        saleContractAddress.toString(),
        false
      );
    }

    return res.status(200).json({
      message: "success",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

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
        return nftBuyCallbackHandler(req, res, next);

      case 'nft-cancel':
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


    // Anonymous numbers, usernames and dns does not have accesible royalty data in common way
    if (collectionAddress.toString() === "EQAOQdwdw8kGftJCSFgOErM1mBjYPe4DBPq8-AhF6vr9si5N" ||
      collectionAddress.toString() === "EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi" ||
      collectionAddress.toString() === "EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz"
    ) {

      return res.status(200).json({
        percent: 0,
        destination: "EQDo8eYrFypI4cCZures4CiGsPXZyyHKR9-f6Vxly60h5lrh",
      });
    }


    const { royalty, destination } = await getRoyaltyParamsFromTonscan(collectionAddress.toString());

    return res.status(200).json({
      percent: royalty,
      destination: destination,
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
