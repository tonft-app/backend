import { getRecentTransactions } from '../toncenter/toncenterApi';
import { selectAllOrdersFromOrders } from '../db/db';
import { randomBytes } from 'crypto';

export const getContractAddress = async (ownerAddress: string, createdAt: string) => {
    const transactions = await getRecentTransactions(process.env.MARKETPLACE_ADDRESS!);
    const unixTime = Number.parseInt(createdAt);

    for (const transaction of transactions) {
        const transactionCreatedTime = Number.parseInt(transaction.utime);
        if (transaction.in_msg?.source === ownerAddress && transactionCreatedTime > unixTime) {
            if (transaction.out_msgs.length === 0) {
                continue;
            }
            return transaction.out_msgs[0].destination;
        }
    }

    return null;
}

export const createHashString = () => {
    const hash = randomBytes(8).toString('hex').toUpperCase();
    const timestamp = Math.floor(Date.now() / 1000);

    return hash.slice(0, -8) + timestamp.toString().slice(-8);
}

export const calculateStatistics = async () => {
    const allOrders = await selectAllOrdersFromOrders();

    let totalSoldAmount = 0;
    let totalItemsSold = 0;
    let totalActiveAmount = 0;
    let totalActiveItems = 0;
    let uniqueWallets: string[] = [];

    for (let i = 0; i < allOrders.length; i++) {
        if (allOrders[i].status === 'sold') {
            totalSoldAmount += parseFloat(allOrders[i].price);
            totalItemsSold++;
        } else if (allOrders[i].status === 'active') {
            totalActiveAmount += parseFloat(allOrders[i].price);
            totalActiveItems++;
        }

        if (!uniqueWallets.includes(allOrders[i].owner_address)) {
            uniqueWallets.push(allOrders[i].owner_address);
        }
    }

    return {
        totalSoldAmount,
        totalItemsSold,
        averageSoldPrice: totalSoldAmount / totalItemsSold,
        totalActiveAmount,
        totalActiveItems,
        averageActivePrice: totalActiveAmount / totalActiveItems,
        totalSavedForUsers: totalSoldAmount * 0.1,
        uniqueWallets: uniqueWallets.length
    }
}


export function roundToPrecision(number: number, precision: number) {
    const factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;

}