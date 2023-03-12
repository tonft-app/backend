import { toNano } from "ton";
import base64url from "base64url";

const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS;
const ROYALTY_ADDRESS = process.env.ROYALTY_ADDRESS;
const TONKEEPER_TXREQUEST_URL = process.env.TONKEEPER_TXREQUEST_URL;

export function createBuyLink(saleContractAddress: string, fullPrice: string, referral: string) {
    const floatPrice = (parseFloat(fullPrice) + 1).toFixed(3);

    const validTx = {
        version: "0",
        body: {
            type: "sign-raw-payload",
            response_options: {
                callback_url: `https://api.tonft.app/apiv1/callbackHandler?type=nft-buy&saleContractAddress=${saleContractAddress}&fullPrice=${fullPrice}&referral=${referral}`
            },
            params: {
                messages: [
                    {
                        address: saleContractAddress,
                        amount: toNano(floatPrice),
                    }
                ]
            },
        },
    };

    const host = TONKEEPER_TXREQUEST_URL;
    const buff = Buffer.from(JSON.stringify(validTx));
    return host + base64url(buff);
}

export function createSaleLink(nftItemAddress: string, fullPrice: string, royaltyPercent: string, royaltyAddress: string, refPercent: string) {
    const comission = Math.round(Number.parseFloat(fullPrice) * (Number.parseFloat(refPercent) / 100) * 100) / 100;
    const royalty = Math.round(Number.parseFloat(fullPrice) * (Number.parseFloat(royaltyPercent) / 100) * 100) / 100;

    console.log(comission);
    const validTx = {
        version: "0",
        body: {
            type: "nft-sale-place",
            response_options: {
                callback_url: `https://api.tonft.app/apiv1/callbackHandler?type=nft-create-sale&nftItemAddress=${nftItemAddress}&fullPrice=${fullPrice}`
            },
            params: {
                marketplaceAddress: MARKETPLACE_ADDRESS,
                marketplaceFee: toNano(comission),
                royaltyAddress: royaltyAddress !== '' ? royaltyAddress : ROYALTY_ADDRESS,
                nftItemAddress: nftItemAddress,
                royaltyAmount: toNano(royalty),
                fullPrice: toNano(fullPrice),
                amount: toNano(0.1),
            },
        },
    };

    const host = TONKEEPER_TXREQUEST_URL;
    const buff = Buffer.from(JSON.stringify(validTx));

    return host + base64url(buff);
}

export function createCancelLink(ownerAddress: string, saleContractAddress: string) {
    const validTx = {
        version: "0",
        body: {
            type: "nft-sale-cancel",
            response_options: {
                callback_url: `https://api.tonft.app/apiv1/callbackHandler?type=nft-cancel&ownerAddress=${ownerAddress}&saleContractAddress=${saleContractAddress}`
            },
            params: {
                saleAddress: saleContractAddress,
                ownerAddress: ownerAddress,
                amount: `${toNano(1)}`
            },
        },
    };

    const host = TONKEEPER_TXREQUEST_URL;
    const buff = Buffer.from(JSON.stringify(validTx));

    return host + base64url(buff);
}


export function createTransferLink(newOwnerAddress: string, nftItemAddress: string) {
    const validTx = {
        version: "0",
        body: {
            type: "nft-transfer",
            response_options: {
                callback_url: `https://api.tonft.app/apiv1/callbackHandler&type=nft-transfer&newOwnerAddress=${newOwnerAddress}&nftItemAddress=${nftItemAddress}`
            },
            params: {
                newOwnerAddress: newOwnerAddress,
                nftItemAddress: nftItemAddress,
                amount: `${toNano(0.1)}`,
                forwardAmount: `${toNano(0.02)}`,
                text: "NFT transfer",
            },
        },
    };

    const host = TONKEEPER_TXREQUEST_URL;
    const buff = Buffer.from(JSON.stringify(validTx));

    return host + base64url(buff);
}