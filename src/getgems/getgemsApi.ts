import axios from 'axios';

const mainPageTopCollectionQuery = `
  query mainPageTopCollection($kind: MPTopKind!, $count: Int!, $cursor: String) {
    mainPageTopCollection(kind: $kind, first: $count, after: $cursor) {
      cursor
      items {
        place
        tonValue
        currencyValue(currency: usd)
        diffPercent
        floorPrice
        currencyFloorPrice(currency: usd)
        collection {
          address
          name
          isVerified
          image {
            image {
              sized(width: 200, height: 200, format: "collection-avatar")
              __typename
            }
            __typename
          }
          approximateHoldersCount
          approximateItemsCount
          __typename
        }
        __typename
      }
      __typename
    }
  }
`;

export async function getFloorDataForCollections() {
    try {
        const response = await axios.post(
            'https://api.getgems.io/graphql',
            {
                'operationName': 'mainPageTopCollection',
                'variables': {
                    'kind': 'all',
                    'count': 500
                },
                'query': mainPageTopCollectionQuery
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

        return floorData;

    }
    catch (error) {
        console.error(error);
    }

    return {};
}
