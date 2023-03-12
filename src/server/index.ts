import * as dotenv from 'dotenv'
dotenv.config()

import { logger } from "./logging";
import apiRouter from "./router";
import express from "express";
import http from "http";

const router = express();
const httpServer = http.createServer(router);

router.use((req, res, next) => {
  logger.info(`METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`);

  res.on("finish", () => {
    logger.info(`METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`);
  });

  next();
});


router.use(express.urlencoded({ extended: true }));
router.use(express.json());

router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method == "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }

  next();
});

router.use("/apiv1", apiRouter);

router.use((req, res, next) => {
  const error = new Error("Not found");

  res.status(404).json({
    message: error.message,
  });
});

httpServer.listen(2281, () => logger.info(`Server is running 127.0.0.1:${2281}`));
