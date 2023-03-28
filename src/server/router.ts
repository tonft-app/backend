import express, { Router } from "express";
import controller from "./controller";

const router: Router = express.Router();

type Route = {
    path: string;
    method: 'get' | 'post' | 'put' | 'delete' | 'patch';
    handler: express.RequestHandler;
};

const routes: Route[] = [
    // Getters
    { path: "/getUserNfts", method: "get", handler: controller.getUserNfts },
    { path: "/getCollectionRoyalty", method: "get", handler: controller.getCollectionRoyalty },
    { path: "/getAllOffers", method: "get", handler: controller.getAllOffers },
    { path: "/getOffer", method: "get", handler: controller.getOffer },
    { path: "/getInitLink", method: "get", handler: controller.getInitLink },
    { path: "/getConfig", method: "get", handler: controller.getConfig },
    { path: "/getCancelLink", method: "get", handler: controller.getCancelLink },
    { path: "/getTransferLink", method: "get", handler: controller.getTransferLink },

    // Checkers
    { path: "/checkInit", method: "get", handler: controller.checkInit },
    { path: "/checkTransfer", method: "get", handler: controller.checkTransfer },

    // Miscellaneous
    { path: "/offer/:id/:referral?", method: "get", handler: controller.getOfferById },
    { path: "/callbackHandler", method: "get", handler: controller.callbackHandler },
];

routes.forEach(({ path, method, handler }) => {
    switch (method) {
        case "get":
            router.get(path, handler);
            break;
        case "post":
            router.post(path, handler);
            break;
        case "put":
            router.put(path, handler);
            break;
        case "delete":
            router.delete(path, handler);
            break;
        case "patch":
            router.patch(path, handler);
            break;
    }
});

export = router;
