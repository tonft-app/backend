import axios from "axios";
import * as dotenv from 'dotenv'

dotenv.config()

import { selectNotProcessedReferralBonus, setProcessedToTrueByIds } from "../db/db";
import { userFriendlyAddress } from "../toncenter/toncenterApi";
import { roundToPrecision } from "../utils/utils";


async function withdrawBonuses(txs: any, comment: string) {
    const params = {
        send_mode: "1",
        comment: comment
    };

    const config = {
        params: params
    };

    console.log("withdrawBonuses", txs)

    try {
        const response = await axios.post('http://localhost:8888/sendTransactions', JSON.stringify(txs), config);
        return response.data;
    } catch (error) {
        // Handle error
        console.error(error);
    }

    return false;
}

(async () => {
    console.log("start")
    while (true) {
        try {
            const notProcessedReferralBonuses = await selectNotProcessedReferralBonus();

            const transactions: any = {}

            for (const notProcessedReferralBonus of notProcessedReferralBonuses) {
                let { id, user_wallet, amount, contract_address, processed, created_at } = notProcessedReferralBonus;

                if (user_wallet === 'undefined') {
                    continue;
                }

                user_wallet = await userFriendlyAddress(user_wallet);
                // Слава Україні
                user_wallet = user_wallet.result.replace('+', '-').replace('/', '_');

                if (transactions[user_wallet]) {
                    transactions[user_wallet] = roundToPrecision((transactions[user_wallet] + (amount * 0.025)), 3);
                } else {
                    transactions[user_wallet] = roundToPrecision((amount * 0.024), 3);
                }

                console.log(user_wallet, amount)
            }

            for (const key in transactions) {
                transactions[key] = transactions[key].toFixed(3);
            }

            console.log("withdrawBonuses")

            let result = false;

            if (Object.keys(transactions).length > 0) {
                console.log(transactions)
                result = await withdrawBonuses(transactions, "Referral bonus from TONFT.app Bazaar ");
            }

            if (result) {
                console.log("success");
                await setProcessedToTrueByIds(notProcessedReferralBonuses.map((notProcessedReferralBonus) => notProcessedReferralBonus.id));
            }

            console.log("sleep 1 min")
            await new Promise((resolve) => setTimeout(resolve, 1000 * 60));

        } catch (error) {
            console.log(error);
        }
    }
}
)();

