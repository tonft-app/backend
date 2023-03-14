import axios from 'axios';

export const getRecentTransactions = async (address: string) => {

    try {
        const response = await axios.get(process.env.TONCENTER_API_URL + 'getTransactions', {
            params: {
                'address': address,
                'limit': '100',
                'to_lt': '0',
                'archival': 'false',
                'api_key': process.env.TONCENTER_API_KEY
            },
            headers: {
                'accept': 'application/json'
            }
        });
        return response.data.result;
    } catch (error) {
        console.log(error)
    }

    return [];
}


export const userFriendlyAddress = async (address: string) => {
    let attempts = 0;

    while (attempts < 3) {
        try {

            const response = await axios.get('https://toncenter.com/api/v2/packAddress', {
                params: {
                    'address': address,
                    'api_key': process.env.TONCENTER_API_KEY
                },
                headers: {
                    'accept': 'application/json'
                }
            });

            return response.data.result.replace(/\+/g, '-').replace(/\//g, '_');
        }
        catch (error) {
            console.log(error)
        }

        attempts++;
    }

    return "";
}


export async function isNftTransfered(contractAddress: string, nftItemAddress: string) {
    const transactions = await getRecentTransactions(contractAddress);

    const transfered = transactions.filter((transaction: any) => {
        return transaction.in_msg.source === nftItemAddress;
    });

    return transfered.length > 0;
}


export async function getContractState(contractAddress: string) {
    try {

        const response = await axios.post(
            'https://toncenter.com/api/v2/runGetMethod',
            // '{\n  "address": "EQAzBnchkH-3luhyuNu2VcgcwfJ6ekzwgjDaQh36VvbiAWrE",\n  "method": "get_sale_data",\n  "stack": [\n  ]\n}',
            {
                'address': contractAddress,
                'method': 'get_sale_data',
                'stack': [],
                'api_key': process.env.TONCENTER_API_KEY
            },
            {
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            result: response.data.result,
            state: response.data.result.stack.length !== 1 ? "active" : "not active",
        }


    }
    catch (error) {
        console.log(error)
    }

    return {
        state: "error"
    }
}




(async () => {
}
)();