import * as express from "express";
import controller from "./controller";

const router = express.Router();

// Getters
router.get("/getUserNfts", controller.getUserNfts);
router.get("/getCollectionRoyalty", controller.getCollectionRoyalty);
router.get("/getAllOffers", controller.getAllOffers);
router.get("/getOffer", controller.getOffer);
router.get("/getInitLink", controller.getInitLink);
router.get("/getConfig", controller.getConfig)
router.get("/getCancelLink", controller.getCancelLink);
router.get("/getTransferLink", controller.getTransferLink);

// Checkers
router.get("/checkInit", controller.checkInit);
router.get("/checkTransfer", controller.checkTransfer);

// Miscellaneous
router.get("/offer/:id/:referral?", controller.getOfferById);
router.get("/callbackHandler", controller.callbackHandler)


export = router;
