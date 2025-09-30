const sql = require('mssql');
const sqlConfig = require('../config/database');

class DatabaseService {
  static async initializeDatabase() {
    try {
      console.log('Connecting to SQL Server...');
      await sql.connect(sqlConfig);
      console.log('Connected to SQL Server');

      // Create table if it doesn't exist
      const request = new sql.Request();
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='checklists' AND xtype='U')
        CREATE TABLE checklists (
          id NVARCHAR(50) PRIMARY KEY,
          slug NVARCHAR(50) UNIQUE NOT NULL,
          checklist NVARCHAR(MAX) NOT NULL,
          role NVARCHAR(200),
          department NVARCHAR(200),
          createdAt DATETIME2 DEFAULT GETDATE()
        )
      `);
      console.log('Database table ready');
    } catch (err) {
      console.error('Database connection failed:', err);
      console.log('App will continue without database functionality');
    }
  }

  static async saveChecklist(id, slug, checklist, role, department) {
    const checklistJson = JSON.stringify(checklist);

    const request = new sql.Request();
    await request
      .input('id', sql.NVarChar, id)
      .input('slug', sql.NVarChar, slug)
      .input('checklist', sql.NVarChar, checklistJson)
      .input('role', sql.NVarChar, role)
      .input('department', sql.NVarChar, department).query(`
        INSERT INTO checklists (id, slug, checklist, role, department)
        VALUES (@id, @slug, @checklist, @role, @department)
      `);

    return slug;
  }

  static async getChecklistBySlug(slug) {
    const request = new sql.Request();
    const result = await request
      .input('slug', sql.NVarChar, slug)
      .query('SELECT * FROM checklists WHERE slug = @slug');

    if (result.recordset.length === 0) {
      return null;
    }

    const item = result.recordset[0];
    return {
      checklist: JSON.parse(item.checklist),
      role: item.role,
      department: item.department,
      createdAt: item.createdAt,
    };
  }

  static async testConnection() {
    try {
      const pool = await sql.connect(sqlConfig);
      return pool.connected ? 'Connected' : 'Disconnected';
    } catch (error) {
      return 'Disconnected';
    }
  }
}

module.exports = DatabaseService;
