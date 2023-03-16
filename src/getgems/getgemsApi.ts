import axios from 'axios';

export async function getFloorDataForCollections() {

    const response = await axios.post(
        'https://api.getgems.io/graphql',
        {
            'operationName': 'mainPageTopCollection',
            'variables': {
                'kind': 'all',
                'count': 500
            },
            'query': 'query mainPageTopCollection($kind: MPTopKind!, $count: Int!, $cursor: String) {\n  mainPageTopCollection(kind: $kind, first: $count, after: $cursor) {\n    cursor\n    items {\n      place\n      tonValue\n      currencyValue(currency: usd)\n      diffPercent\n      floorPrice\n      currencyFloorPrice(currency: usd)\n      collection {\n        address\n        name\n        isVerified\n        image {\n          image {\n            sized(width: 200, height: 200, format: "collection-avatar")\n            __typename\n          }\n          __typename\n        }\n        approximateHoldersCount\n        approximateItemsCount\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}'
        },
    );

    const floorData: any = {};

    response.data.data.mainPageTopCollection.items.forEach((element: any) => {
        const address = element.collection.address;
        floorData[address] = {
            floorPrice: element.floorPrice,
            name: element.collection.name,
        };
    });

    console.log(floorData);

    return floorData;
}

(async () => {
    await getFloorDataForCollections();
}
)();