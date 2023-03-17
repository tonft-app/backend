

import axios from 'axios';

export const getRoyaltyParamsFromTonscan = async (address: string) => {
    const response = await axios.get(`https://api.ton.cat/v2/contracts/nft/${address}`, {
    });

    return {
        royalty: response.data.nft_collection.royalty.share_percent,
        destination: response.data.nft_collection.royalty.address
    };
}


(async () => {

})();