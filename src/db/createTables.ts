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


export const createTables = async () => {
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
    );
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        address VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
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
    );
    `);

    await client.end();
}

(async () => {
    await createTables();
})();