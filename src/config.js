// Central runtime config. Reads .env once; every value has a dev-friendly
// default so the API runs on a fresh clone with no .env at all (LocalDB +
// Windows auth). See .env.example for the overridable values.
require("dotenv").config();

const config = {
  PORT: parseInt(process.env.PORT || "3002", 10),

  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",

  DB_CONNECTION_STRING:
    process.env.DB_CONNECTION_STRING ||
    `server=${process.env.DB_SERVER || "(localdb)\\MSSQLLocalDB"};` +
      `Database=${process.env.DB_NAME || "tabletop"};` +
      `Trusted_Connection=Yes;` +
      `Driver={${process.env.DB_DRIVER || "ODBC Driver 17 for SQL Server"}};`,
};

module.exports = config;
