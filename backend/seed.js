const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool(process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
} : {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const seed = async () => {
    try {
        console.log('--- Starting Database Seeding ---');

        // 1. Create Users Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Users table ensured');

        // 2. Ensure Expenses table has price tracking (already exists but just in case)
        await pool.query(`
            ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tea_price NUMERIC DEFAULT 10;
            ALTER TABLE expenses ADD COLUMN IF NOT EXISTS water_price NUMERIC DEFAULT 35;
        `);
        console.log('✅ Expenses table columns verified');

        // 3. Insert Default User
        const username = 'Ankiom';
        const plainPassword = 'Ankiom@2015';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (userExists.rows.length === 0) {
            await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
            console.log(`✅ Default user "${username}" created successfully!`);
        } else {
            // Update password just in case user wants to reset it via seed
            await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hashedPassword, username]);
            console.log(`✅ Default user "${username}" already exists. Password updated.`);
        }

        console.log('--- Seeding Completed Successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seed();
