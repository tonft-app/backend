import { getFloorDataForCollections } from "./getgemsApi";


(async () => {
    while (true) {
        const floorPrice = await getFloorDataForCollections();
        const fs = require('fs');

        floorPrice.timestamp = new Date().toISOString();

        fs.appendFile('floorPrice.json', JSON.stringify(floorPrice) + ',\n', function (err: any) {
            if (err) throw err;
            console.log('Saved!');
        });


        console.log('sleeping for 1 minute...')
        await new Promise(resolve => setTimeout(resolve, 1000 * 60));
    }
})();