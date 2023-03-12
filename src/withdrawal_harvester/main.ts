import axios from "axios";
import * as dotenv from 'dotenv'

dotenv.config()

import { selectNotProcessedReferralBonus, setProcessedToTrueByIds } from "../db/db";

async function createUserFriendlyAddress(address: string) {
    const response = await axios.get('https://toncenter.com/api/v2/packAddress', {
        params: {
            'address': address,
            'api_key': "26a360b96446a5c9ff5a3dd16d4ae8731840d5efcb22c0a08e71be18c1662535"
        },
        headers: {
            'accept': 'application/json'
        }
    });

    console.log(response.data);

    return response.data;
}

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
}

(async () => {
    console.log("start")
    while (true) {
        console.log("selectNotProcessedReferralBonus")
        const notProcessedReferralBonuses = await selectNotProcessedReferralBonus();

        const transactions: any = {}

        for (const notProcessedReferralBonus of notProcessedReferralBonuses) {
            let { id, user_wallet, amount, contract_address, processed, created_at } = notProcessedReferralBonus;

            if (user_wallet === 'undefined') {
                continue;
            }

            user_wallet = await createUserFriendlyAddress(user_wallet);
            // Слава Україні
            user_wallet = user_wallet.result.replace('+', '-').replace('/', '_');



            if (transactions[user_wallet]) {
                transactions[user_wallet].amount = (transactions[user_wallet].amount + (amount * 0.025));
            } else {
                transactions[user_wallet] = (amount * 0.025)
            }
        }

        for (const key in transactions) {
            transactions[key] = transactions[key].toFixed(3);
        }

        console.log("withdrawBonuses")

        let result = false;
        if (transactions.length > 0) {
            result = await withdrawBonuses(transactions, "Referral bonus from TONFT.app Bazaar ");
        }

        await setProcessedToTrueByIds(notProcessedReferralBonuses.map((notProcessedReferralBonus) => notProcessedReferralBonus.id));

        if (result) {
            console.log("success");
        }


        console.log("sleep 1 min")
        await new Promise((resolve) => setTimeout(resolve, 1000 * 60));
    }
}
)();
