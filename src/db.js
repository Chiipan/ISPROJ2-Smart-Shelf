const sql = require('msnodesqlv8');
const { DB_CONNECTION_STRING: connectionString } = require('./config');

function getDBConnection() {
  return new Promise((resolve, reject) => {
    sql.open(connectionString, (err, conn) => {
      if (err) {
        console.error('❌ MSSQL Connection Error:', err);
        reject(err);
      } else {
        console.log('✅ MSSQL Connected using Windows Authentication');
        resolve(conn);
      }
    });
  });
}

function executeQueryForRepo(query, params = []) {
  return new Promise((resolve, reject) => {
    sql.open(connectionString, (err, conn) => {
      if (err) return reject(err);

      conn.query(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  });
}

// Export for CommonJS
module.exports = {
  getDBConnection,
  executeQueryForRepo,
};
