import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const connectDb = async () => {
  try {
    await pool.connect();
    console.log('Connected to the database');
  } catch (err) {
    console.error('Database connection error', err);
    process.exit(1);
  }
};

export const query = (text: string, params?: any[]) => pool.query(text, params);