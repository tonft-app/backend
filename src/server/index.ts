import { configureEnvironment } from "./config";
import { logRequestMiddleware, corsMiddleware } from "./middlewares";
import { notFoundErrorHandler } from "./errorHandling";
import apiRouter from "./router";
import express from "express";
import http from "http";
import { logger } from "./logging";

configureEnvironment();

const router = express();
const httpServer = http.createServer(router);

router.use(logRequestMiddleware);
router.use(express.urlencoded({ extended: true }));
router.use(express.json());
router.use(corsMiddleware);
router.use("/apiv1", apiRouter);
router.use(notFoundErrorHandler);

httpServer.listen(2281, () => logger.info(`Server is running 127.0.0.1:${2281}`));
