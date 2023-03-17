import axios from 'axios';

export const getRoyaltyParams = async (address: string) => {
    const response = await axios.post(
        'https://explorer.tonnft.tools/api',
        new URLSearchParams({
            'method': 'getRoyaltyParams',
            'address': address
        }),
        {
            headers: {
                'authority': 'explorer.tonnft.tools',
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'cache-control': 'no-cache',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'cookie': '_ym_uid=1678323425908938224; _ym_d=1678323425; _ym_isad=1; _ym_visorc=w',
                'origin': 'https://explorer.tonnft.tools',
                'pragma': 'no-cache',
                'referer': 'https://explorer.tonnft.tools/collection/EQC4mW0V_L16it5SRHx6ItwQDFwumVbd1cwyLAJ7E126KERa',
                'sec-ch-ua': '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                'x-requested-with': 'XMLHttpRequest'
            }
        }
    );

    return response.data;
}


(async () => {
    const res = await getRoyaltyParams("EQAl_hUCAeEv-fKtGxYtITAS6PPxuMRaQwHj0QAHeWe6ZSD0");
    console.log(res);

}
)();