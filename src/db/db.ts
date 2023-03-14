import { Client } from 'pg';
import * as dotenv from 'dotenv'
dotenv.config()

const DATABASE_CONFIG = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: Number.parseInt(process.env.DB_PORT!),
}

interface Order {
    id: number;
    contract_address: string;
    nft_item_address: string;
    owner_address: string;
    price: number;
    status: string;
    royalty_percent: number;
    royalty_address: string;
    ref_percent: number;
    bought_by: string;
    hash: string;
    created_at: Date;
}

interface User {
    id: number;
    address: string;
    created_at: Date;
}

interface ReferralBonus {
    id: number;
    user_wallet: string;
    amount: number;
    contract_address: string;
    processed: boolean;
    created_at: Date;
}

export const getOrderBySaleContractAddress = async (saleContractAddress: string): Promise<Order> => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    const { rows } = await client.query(
        `SELECT * FROM orders
        WHERE contract_address = $1
        AND status = 'active'`,
        [saleContractAddress]
    );
    await client.end();

    return rows[0] as Order;
}

export const createReferralBonusTable = async () => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    await client.query(`
    CREATE TABLE referral_bonus (
        id SERIAL PRIMARY KEY,
        user_wallet VARCHAR(255) NOT NULL,
        amount REAL NOT NULL,
        contract_address VARCHAR(255) NOT NULL,
        processed BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.end();
}

const createUsersTable = async () => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    await client.query(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        address VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await client.end();
}

const createNewOrdersTable = async () => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    await client.query(`CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        contract_address VARCHAR(100) NOT NULL,
        nft_item_address VARCHAR(100) NOT NULL,
        owner_address VARCHAR(100) NOT NULL,
        price REAL NOT NULL,
        status VARCHAR(100) NOT NULL,
        royalty_percent REAL,
        royalty_address VARCHAR(100),
        ref_percent REAL,
        bought_by VARCHAR(100),
        hash VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.end();
}

export const getAllActiveOrders = async () => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    console.log('getAllActiveOrders');
    const { rows } = await client.query(
        `SELECT * FROM orders 
        WHERE status = 'active'`
    );
    await client.end();

    return rows;

}

export const setStatusByHashes = async (hashes: string[], status: string) => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    const { rows } = await client.query(
        `UPDATE orders 
        SET status = $1 
        WHERE hash IN (${hashes.map((_, i) => `$${i + 2}`).join(',')})`,
        [status, ...hashes]
    );
    await client.end();

    return rows;
}

export const getOrderByHash = async (hash: string) => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    const { rows } = await client.query(
        `SELECT * FROM orders 
        WHERE hash = $1`,
        [hash]
    );
    await client.end();

    if (rows.length === 0) {
        return null;
    }

    return rows[0];
}


export const getOrders = async (nftItemAddress: string, ownerAddress: string, contractAddress: string) => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    const { rows } = await client.query(
        `SELECT * 
        FROM orders
        WHERE nft_item_address = $1 
            AND owner_address = $2 
            AND contract_address=$3`,
        [nftItemAddress, ownerAddress, contractAddress]
    );
    await client.end();

    return rows;
}



export const insertIntoOrders = async (contractAddress: string, nftItemAddress: string, ownerAddress: string, price: string, status: string, royaltyPercent: string, royaltyAddress: string, refPercent: string, boughtBy: string, hash: string) => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    const { rows } = await client.query(
        `SELECT * 
        FROM orders
        WHERE hash = $1`,
        [hash]
    );
    if (rows.length > 0) {
        return { hash, error: 'hash already exists' };
    }

    await client.query(
        `INSERT INTO orders (
            contract_address,
            nft_item_address,
            owner_address,
            price, status,
            royalty_percent,
            royalty_address,
            ref_percent,
            bought_by,
            hash
            )
        VALUES (
            $1, 
            $2, 
            $3, 
            $4, 
            $5, 
            $6, 
            $7, 
            $8, 
            $9, 
            $10
            )`,
        [contractAddress, nftItemAddress, ownerAddress, price, status, royaltyPercent, royaltyAddress, refPercent, boughtBy, hash]
    );
    await client.end();

    return { hash, error: null };

}



export const changeStatusOfOrder = async (nftItemAddress: string, status: string) => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    await client.query(
        `UPDATE orders 
        SET status = $1 
        WHERE nft_item_address = $2`,
        [status, nftItemAddress]
    );

    await client.end();
}

export const changeStatusOfOrderBySaleContractAddress = async (saleContractAddress: string, status: string) => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    await client.query(
        `UPDATE orders 
        SET status = $1 
        WHERE contract_address = $2`,
        [status, saleContractAddress]
    );
    await client.end();
}

export const insertIntoOrdersTable = async (contractAddress: string, nftItemAddress: string, ownerAddress: string, price: string, status: string, royaltyPercent: string, royaltyAddress: string, refPercent: string, boughtBy: string, hash: string) => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();

    await client.query(`INSERT INTO orders (
        contract_address,
        nft_item_address,
        owner_address,
        price,
        status,
        royalty_percent,
        royalty_address,
        ref_percent,
        bought_by,
        hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [contractAddress, nftItemAddress, ownerAddress, price, status, royaltyPercent, royaltyAddress, refPercent, boughtBy, hash]);

    await client.end();
}


export const deleteOrdersByIds = async (ids: number[]) => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    for (let i = 0; i < ids.length; i++) {
        await client.query(
            `DELETE FROM orders 
            WHERE id = ${ids[i]}`
        );
    }
    await client.end();
}


export const insertIntoReferralBonusTable = async (wallet_address: string, amount: string, contract_address: string, processed: boolean) => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    await client.query(
        `INSERT INTO referral_bonus (user_wallet, amount, contract_address, processed) VALUES ($1, $2, $3, $4)`,
        [wallet_address, amount, contract_address, processed]
    );

    await client.end();
}


// select all solded orders and calculate different statistics for example: total solded amount, total items solded
export const selectAllSoldedOrders = async () => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    const { rows } = await client.query(
        `SELECT * 
        FROM orders 
        WHERE status = 'sold'`
    );
    await client.end();

    return rows;
}

export const changeStatusToCancelled = async () => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    await client.query(
        `UPDATE orders 
        SET status = 'cancelled' 
        WHERE status = 'not active'`
    );
    await client.end();
}

export const selectAllOrdersFromOrders = async () => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    const { rows } = await client.query(`SELECT * FROM orders`);
    await client.end();

    return rows;
}


export const selectNotProcessedReferralBonus = async () => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    const { rows } = await client.query(
        `SELECT * 
        FROM referral_bonus 
        WHERE processed = false`
    );
    await client.end();

    return rows;
}

export const setProcessedToTrueByIds = async (ids: number[]) => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();
    for (let i = 0; i < ids.length; i++) {
        await client.query(
            `UPDATE referral_bonus 
            SET processed = true 
            WHERE id = ${ids[i]}`
        );
    }
    await client.end();
}

export const deleteOrderByHash = async (hash: string) => {
    const client = new Client(DATABASE_CONFIG);

    await client.connect();

    await client.query(

        `DELETE FROM orders

        WHERE hash = '${hash}'`

    );

    await client.end();
}
