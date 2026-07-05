import { getDBConnection, executeQueryForRepo } from './db.js';

async function testConnection() {
  try {
    // Test 1: raw connection
    const conn = await getDBConnection();
    console.log('✅ Connection object received');

    conn.query('SELECT 1 AS test', (err, rows) => {
      if (err) {
        console.error('❌ Query error:', err);
      } else {
        console.log('✅ Raw query result:', rows);
      }
      conn.close();
    });

    // Test 2: helper function
    const results = await executeQueryForRepo('SELECT GETDATE() AS currentTime');
    console.log('✅ executeQueryForRepo result:', results);

  } catch (err) {
    console.error('❌ DB Test Failed:', err);
  }
}

testConnection();
