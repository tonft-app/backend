export type ValidationConfig = {
    fieldName: string;
    validationFn: (value: any) => boolean;
    errorMessage: string;
};


const nftItemAddressConfig: ValidationConfig = {
    fieldName: 'nftItemAddress',
    validationFn: (value) => !!value,
    errorMessage: 'nftItemAddress is required',
};

const fullPriceConfig: ValidationConfig = {
    fieldName: 'fullPrice',
    validationFn: (value) => !!value && !isNaN(Number.parseFloat(value.toString())),
    errorMessage: 'fullPrice is required and should be a number',
};

const royaltyPercentConfig: ValidationConfig = {
    fieldName: 'royaltyPercent',
    validationFn: (value) => !!value && !isNaN(Number.parseFloat(value.toString())),
    errorMessage: 'royaltyPercent is required and should be a number',
};

const royaltyAddressConfig: ValidationConfig = {
    fieldName: 'royaltyAddress',
    validationFn: (value) => !!value,
    errorMessage: 'royaltyAddress is required',
};

const refPercentConfig: ValidationConfig = {
    fieldName: 'refPercent',
    validationFn: (value) => !!value,
    errorMessage: 'ref_percent is required',
};

const ownerAddressConfig: ValidationConfig = {
    fieldName: 'ownerAddress',
    validationFn: (value) => !!value,
    errorMessage: 'ownerAddress is required',
};

const createdAtConfig: ValidationConfig = {
    fieldName: 'createdAt',
    validationFn: (value) => !!value && !isNaN(Number.parseInt(value.toString())),
    errorMessage: 'createdAt is required and should be a number',
};


const contractAddressConfig: ValidationConfig = {
    fieldName: 'contractAddress',
    validationFn: (value) => !!value,
    errorMessage: 'contractAddress is required',
};

const priceConfig: ValidationConfig = {
    fieldName: 'price',
    validationFn: (value) => !!value,
    errorMessage: 'price is required',
};

const hashConfig: ValidationConfig = {
    fieldName: 'hash',
    validationFn: (value) => !!value,
    errorMessage: 'hash is required',
};

const userAddressConfig: ValidationConfig = {

    fieldName: 'userAddress',
    validationFn: (value) => !!value,
    errorMessage: 'userAddress is required',
};

const saleContractAddressConfig: ValidationConfig = {
    fieldName: "saleContractAddress",
    validationFn: (value) => !!value,
    errorMessage: "saleContractAddress is required",
};


export const validationConfig: Record<string, ValidationConfig[]> = {
    getInitLink: [
        nftItemAddressConfig,
        fullPriceConfig,
        royaltyPercentConfig,
        royaltyAddressConfig,
        refPercentConfig,
    ],
    getOffer: [
        nftItemAddressConfig,
        ownerAddressConfig,
        saleContractAddressConfig,
    ],
    checkInit: [
        ownerAddressConfig,
        createdAtConfig,
    ],
    getTransferLink: [
        contractAddressConfig,
        nftItemAddressConfig,
    ],
    checkTransfer: [
        contractAddressConfig,
        nftItemAddressConfig,
        ownerAddressConfig,
        priceConfig,
        royaltyPercentConfig,
        royaltyAddressConfig,
        refPercentConfig,
        hashConfig,
    ],
    getUserNfts: [
        userAddressConfig,
    ],
    getCancelLink: [
        ownerAddressConfig,
        saleContractAddressConfig,
    ],
    nftBuyCallbackHandler: [
        saleContractAddressConfig,
        fullPriceConfig,
    ],
};