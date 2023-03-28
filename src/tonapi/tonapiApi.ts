import axios from 'axios';

export const getNftsByUserAddress = async (address: string) => {
    const response = await axios.get('https://tonapi.io/v1/nft/searchItems', {
        params: {
            'owner': address,
            'include_on_sale': 'true',
            'limit': '1000',
            'offset': '0'
        },
        headers: {
            'accept': 'application/json',
            'Authorization': 'Bearer ' + process.env.TONAPI_TOKEN,
        }
    });

    if (response.data.error) {
        return [];
    }


    return response.data.nft_items;
}

export const getNftItems = async (addresses: string) => {
    const response = await axios.get('https://tonapi.io/v1/nft/getItems', {
        params: {
            'addresses': addresses
        },
        headers: {
            'accept': 'application/json',
            'Authorization': 'Bearer ' + process.env.TONAPI_TOKEN,
        }
    });

    if (response.data.error) {
        return [];
    }

    return response.data.nft_items;
}
