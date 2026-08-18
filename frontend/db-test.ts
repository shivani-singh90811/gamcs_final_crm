import "dotenv/config";
import mysql from "mysql2/promise";

async function testDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [rows] = await connection.query(
      "SELECT DATABASE() AS database_name"
    );

    console.log("MySQL connected successfully!");
    console.log(rows);

    await connection.end();
  } catch (error) {
    console.error("MySQL connection failed:");
    console.error(error);
  }
}

testDatabase();