const sql = require('msnodesqlv8');

// Shared dev server (RIVS-LPLEGION5) alternative:
// 'server=RIVS-LPLEGION5\\MSSQLSERVER2019;Database=tabletop;Trusted_Connection=Yes;Driver={ODBC Driver 17 for SQL Server};'
const connectionString =
  'server=(localdb)\\MSSQLLocalDB;Database=tabletop;Trusted_Connection=Yes;Driver={ODBC Driver 17 for SQL Server};';

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
