require('dotenv').config();
const { poolPromise } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function createAuthTables() {
  try {
    console.log('🔄 Creating authentication tables...');

    const pool = await poolPromise;

    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '../database/auth-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL statements and execute them one by one
    const statements = schemaSql
      .split('GO')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('📝 Executing SQL statement...');
        await pool.request().query(statement);
      }
    }

    console.log('✅ Authentication tables created successfully!');

    // Verify tables exist
    const result = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('Users', 'UserSessions')
    `);

    console.log(
      '📋 Created tables:',
      result.recordset.map(r => r.TABLE_NAME)
    );

    // Check if default admin user exists
    const adminCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM Users WHERE role = 'admin'
    `);

    console.log(`👑 Admin users found: ${adminCheck.recordset[0].count}`);

    return true;
  } catch (error) {
    console.error('❌ Error creating authentication tables:', error.message);
    throw error;
  }
}

createAuthTables();
