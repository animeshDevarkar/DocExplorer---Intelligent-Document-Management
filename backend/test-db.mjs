import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();
const sql = postgres(process.env.DATABASE_URL);
sql`SELECT ai_summary FROM documents ORDER BY created_at DESC LIMIT 1`.then(res => {
    console.log('RAW DB SUMMARY:', JSON.stringify(res[0].ai_summary));
    sql.end();
}).catch(console.error);
