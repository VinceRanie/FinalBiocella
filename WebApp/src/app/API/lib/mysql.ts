import mysql, { RowDataPacket, ResultSetHeader } from 'mysql2/promise'

let pool: mysql.Pool | null = null;

const getPool = (): mysql.Pool => {
    if (pool) return pool;

    const DB_HOST = process.env.DB_HOST;
    const DB_USER = process.env.DB_USER;
    const DB_PASSWORD = process.env.DB_PASSWORD;
    const DB_NAME = process.env.DB_NAME;
    const DB_PORT = process.env.DB_PORT;

    if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME || !DB_PORT) {
        throw new Error('Missing required DB environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT');
    }

    pool = mysql.createPool({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        port: parseInt(DB_PORT, 10),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    return pool;
};

export async function query<T extends RowDataPacket  | ResultSetHeader>(
    sql: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values?: any[]
): Promise<T[]>{
    const activePool = getPool();

    if (sql.trim().toUpperCase().startsWith('SELECT')){
        const [rows] = await activePool.execute(sql, values);
        return rows as T[]
    }else{
        const [result] = await activePool.execute(sql, values);
        return [result as T]; 
    }
}
