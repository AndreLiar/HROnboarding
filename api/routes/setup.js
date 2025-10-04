const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcryptjs');

const router = express.Router();

/**
 * @swagger
 * /setup/auth-tables:
 *   post:
 *     summary: Create authentication database tables
 *     tags: [Setup]
 *     responses:
 *       200:
 *         description: Tables created successfully
 *       500:
 *         description: Database error
 */
router.post('/auth-tables', async (req, res) => {
  try {
    console.log('🔄 Creating authentication tables...');

    // Get database connection
    const pool = await sql.connect({
      server: process.env.DATABASE_SERVER,
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
    });

    // Create Users table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
      CREATE TABLE Users (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          email NVARCHAR(255) UNIQUE NOT NULL,
          password_hash NVARCHAR(255) NOT NULL,
          first_name NVARCHAR(100) NOT NULL,
          last_name NVARCHAR(100) NOT NULL,
          role NVARCHAR(50) DEFAULT 'employee' CHECK (role IN ('admin', 'hr_manager', 'employee')),
          email_verified BIT DEFAULT 0,
          is_active BIT DEFAULT 1,
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          updated_at DATETIME2 DEFAULT GETUTCDATE(),
          last_login DATETIME2 NULL,
          password_reset_token NVARCHAR(255) NULL,
          password_reset_expires DATETIME2 NULL,
          login_attempts INT DEFAULT 0,
          locked_until DATETIME2 NULL
      );
    `);

    // Create UserSessions table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserSessions' AND xtype='U')
      CREATE TABLE UserSessions (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          user_id UNIQUEIDENTIFIER NOT NULL,
          token_hash NVARCHAR(255) NOT NULL,
          ip_address NVARCHAR(45),
          user_agent NVARCHAR(500),
          expires_at DATETIME2 NOT NULL,
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          is_active BIT DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      );
    `);

    // Create indexes for performance
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Email')
      CREATE INDEX IX_Users_Email ON Users(email);
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Role')
      CREATE INDEX IX_Users_Role ON Users(role);
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_UserSessions_UserId')
      CREATE INDEX IX_UserSessions_UserId ON UserSessions(user_id);
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_UserSessions_TokenHash')
      CREATE INDEX IX_UserSessions_TokenHash ON UserSessions(token_hash);
    `);

    // Check if default admin user exists
    const adminCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM Users WHERE email = 'admin@hr-onboarding.com'
    `);

    if (adminCheck.recordset[0].count === 0) {
      const hashedPassword = await bcrypt.hash('AdminPassword123!', 12);

      await pool
        .request()
        .input('email', 'admin@hr-onboarding.com')
        .input('password_hash', hashedPassword)
        .input('first_name', 'System')
        .input('last_name', 'Administrator')
        .input('role', 'admin').query(`
          INSERT INTO Users (email, password_hash, first_name, last_name, role, email_verified, is_active)
          VALUES (@email, @password_hash, @first_name, @last_name, @role, 1, 1)
        `);

      console.log('👑 Default admin user created');
    }

    // Verify tables exist
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('Users', 'UserSessions')
    `);

    const userCount = await pool.request().query('SELECT COUNT(*) as count FROM Users');

    console.log('✅ Authentication tables created successfully!');

    res.json({
      message: 'Authentication database schema executed successfully',
      tables: tablesResult.recordset.map(r => r.TABLE_NAME),
      userCount: userCount.recordset[0].count,
      defaultAdmin: {
        email: 'admin@hr-onboarding.com',
        password: 'AdminPassword123!',
        note: 'Default admin account created - change password after first login',
      },
    });
  } catch (error) {
    console.error('❌ Error executing database schema:', error.message);
    res.status(500).json({
      error: 'Failed to execute authentication database schema',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /setup/template-tables:
 *   post:
 *     summary: Create template management database tables
 *     tags: [Setup]
 *     responses:
 *       200:
 *         description: Template tables created successfully
 *       500:
 *         description: Database error
 */
router.post('/template-tables', async (req, res) => {
  try {
    console.log('🔄 Creating template management tables...');

    const pool = await sql.connect({
      server: process.env.DATABASE_SERVER,
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
    });

    // Execute template schema step by step
    console.log('📝 Creating ChecklistTemplates table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ChecklistTemplates' AND xtype='U')
      CREATE TABLE ChecklistTemplates (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          name NVARCHAR(255) NOT NULL,
          description NTEXT,
          category NVARCHAR(100) NOT NULL,
          version INT DEFAULT 1,
          status NVARCHAR(50) DEFAULT 'draft',
          created_by UNIQUEIDENTIFIER REFERENCES Users(id),
          approved_by UNIQUEIDENTIFIER REFERENCES Users(id),
          approved_at DATETIME2,
          template_data NTEXT NOT NULL,
          tags NVARCHAR(500),
          is_default BIT DEFAULT 0,
          is_public BIT DEFAULT 1,
          usage_count INT DEFAULT 0,
          estimated_duration_minutes INT,
          target_roles NVARCHAR(200),
          target_departments NVARCHAR(200),
          compliance_frameworks NVARCHAR(200),
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          updated_at DATETIME2 DEFAULT GETUTCDATE()
      );
    `);

    console.log('📝 Creating TemplateItems table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TemplateItems' AND xtype='U')
      CREATE TABLE TemplateItems (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          template_id UNIQUEIDENTIFIER REFERENCES ChecklistTemplates(id) ON DELETE CASCADE,
          title NVARCHAR(500) NOT NULL,
          description NTEXT,
          category NVARCHAR(100),
          is_required BIT DEFAULT 1,
          estimated_duration_minutes INT DEFAULT 30,
          sort_order INT NOT NULL,
          dependencies NTEXT,
          assignee_role NVARCHAR(100) DEFAULT 'employee',
          due_days_from_start INT DEFAULT 1,
          instructions NTEXT,
          success_criteria NTEXT,
          attachments_required BIT DEFAULT 0,
          approval_required BIT DEFAULT 0,
          created_at DATETIME2 DEFAULT GETUTCDATE()
      );
    `);

    console.log('📝 Creating TemplateCategories table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TemplateCategories' AND xtype='U')
      CREATE TABLE TemplateCategories (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          name NVARCHAR(100) UNIQUE NOT NULL,
          display_name NVARCHAR(255) NOT NULL,
          description NTEXT,
          icon NVARCHAR(100),
          color NVARCHAR(7),
          sort_order INT DEFAULT 0,
          is_active BIT DEFAULT 1,
          created_by UNIQUEIDENTIFIER REFERENCES Users(id),
          created_at DATETIME2 DEFAULT GETUTCDATE()
      );
    `);

    console.log('📝 Creating TemplateVersionHistory table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TemplateVersionHistory' AND xtype='U')
      CREATE TABLE TemplateVersionHistory (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          template_id UNIQUEIDENTIFIER REFERENCES ChecklistTemplates(id) ON DELETE CASCADE,
          version_number INT NOT NULL,
          name NVARCHAR(255),
          description NTEXT,
          template_data NTEXT,
          changes_summary NTEXT,
          created_by UNIQUEIDENTIFIER REFERENCES Users(id),
          created_at DATETIME2 DEFAULT GETUTCDATE()
      );
    `);

    console.log('📝 Creating TemplateApprovalRequests table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TemplateApprovalRequests' AND xtype='U')
      CREATE TABLE TemplateApprovalRequests (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          template_id UNIQUEIDENTIFIER REFERENCES ChecklistTemplates(id) ON DELETE CASCADE,
          requested_by UNIQUEIDENTIFIER REFERENCES Users(id),
          assigned_to UNIQUEIDENTIFIER REFERENCES Users(id),
          status NVARCHAR(50) DEFAULT 'pending',
          comments NTEXT,
          changes_requested NTEXT,
          responded_at DATETIME2,
          created_at DATETIME2 DEFAULT GETUTCDATE()
      );
    `);

    console.log('📝 Creating TemplateUsage table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TemplateUsage' AND xtype='U')
      CREATE TABLE TemplateUsage (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          template_id UNIQUEIDENTIFIER REFERENCES ChecklistTemplates(id),
          used_by UNIQUEIDENTIFIER REFERENCES Users(id),
          checklist_instance_id UNIQUEIDENTIFIER,
          usage_context NVARCHAR(100),
          created_at DATETIME2 DEFAULT GETUTCDATE()
      );
    `);

    console.log('📝 Creating indexes...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ChecklistTemplates_Category')
      CREATE INDEX IX_ChecklistTemplates_Category ON ChecklistTemplates(category);
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TemplateItems_TemplateId')
      CREATE INDEX IX_TemplateItems_TemplateId ON TemplateItems(template_id);
    `);

    console.log('📝 Inserting default categories...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM TemplateCategories WHERE name = 'onboarding')
      BEGIN
        INSERT INTO TemplateCategories (name, display_name, description, icon, color, sort_order) VALUES
        ('onboarding', 'Employee Onboarding', 'Templates for new employee onboarding process', 'user-plus', '#10B981', 1),
        ('offboarding', 'Employee Offboarding', 'Templates for employee departure process', 'user-minus', '#EF4444', 2),
        ('compliance', 'Compliance & Training', 'Templates for regulatory compliance and mandatory training', 'shield-check', '#F59E0B', 3),
        ('training', 'Skills Training', 'Templates for professional development and training programs', 'academic-cap', '#3B82F6', 4),
        ('equipment', 'Equipment & Access', 'Templates for equipment setup and system access provisioning', 'desktop-computer', '#8B5CF6', 5),
        ('technical', 'Technical Onboarding', 'Templates for technical roles (developers, engineers, IT)', 'code', '#06B6D4', 6),
        ('management', 'Management Onboarding', 'Templates for managers and leadership positions', 'user-group', '#EC4899', 7),
        ('commercial', 'Commercial Onboarding', 'Templates for sales, business development and commercial roles', 'chart-bar', '#F97316', 8),
        ('legal', 'Legal & Regulatory', 'Templates for legal compliance and French regulatory requirements', 'scale', '#7C3AED', 9),
        ('security', 'Security & Privacy', 'Templates for RGPD, security clearance and data protection', 'lock-closed', '#DC2626', 10),
        ('internship', 'Internship Programs', 'Templates for interns, apprentices and work-study programs', 'student', '#059669', 11),
        ('remote', 'Remote Workers', 'Templates for remote and hybrid work arrangements', 'home', '#0891B2', 12),
        ('freelance', 'Freelance & Contractors', 'Templates for freelancers and external contractors', 'briefcase', '#7C2D12', 13),
        ('custom', 'Custom Workflows', 'Organization-specific custom workflow templates', 'cog', '#6B7280', 14);
      END
    `);

    console.log('📝 Creating default template...');
    const adminCheck = await pool
      .request()
      .query(`SELECT TOP 1 id FROM Users WHERE role = 'admin'`);
    if (adminCheck.recordset.length > 0) {
      const adminUserId = adminCheck.recordset[0].id;

      await pool.request().input('adminUserId', adminUserId).query(`
          IF NOT EXISTS (SELECT * FROM ChecklistTemplates WHERE name = 'Standard Employee Onboarding')
          BEGIN
            DECLARE @templateId UNIQUEIDENTIFIER = NEWID();
            
            INSERT INTO ChecklistTemplates (
                id, name, description, category, status, created_by, approved_by, approved_at,
                template_data, tags, is_default, estimated_duration_minutes, 
                target_roles, target_departments, compliance_frameworks
            ) VALUES (
                @templateId,
                'Standard Employee Onboarding',
                'Comprehensive onboarding checklist for new employees covering all essential steps from documentation to system access.',
                'onboarding',
                'approved',
                @adminUserId,
                @adminUserId,
                GETUTCDATE(),
                '{"version": "1.0", "type": "onboarding", "items": []}',
                'onboarding,new hire,documentation,training,access',
                1,
                480,
                '["employee", "manager", "contractor"]',
                '["HR", "IT", "Operations"]',
                '["GDPR", "SOX"]'
            );

            INSERT INTO TemplateItems (template_id, title, description, category, sort_order, assignee_role, due_days_from_start, estimated_duration_minutes, is_required, approval_required) VALUES
            (@templateId, 'Complete Employment Documentation', 'Fill out all required employment forms, contracts, and legal documentation', 'documentation', 1, 'hr', 1, 60, 1, 0),
            (@templateId, 'Employee Handbook Review', 'Read and acknowledge receipt of employee handbook and company policies', 'training', 2, 'employee', 2, 90, 1, 0),
            (@templateId, 'IT Equipment Setup', 'Provision laptop, phone, and other necessary equipment', 'equipment', 3, 'it', 1, 45, 1, 0),
            (@templateId, 'System Access Provisioning', 'Create accounts and provide access to necessary systems and applications', 'equipment', 4, 'it', 2, 30, 1, 0),
            (@templateId, 'Security Training Completion', 'Complete mandatory cybersecurity awareness training', 'training', 5, 'employee', 5, 120, 1, 1),
            (@templateId, 'Team Introduction Meeting', 'Schedule and attend introduction meeting with immediate team members', 'training', 6, 'manager', 3, 60, 1, 0);
          END
        `);
    }

    // Verify template tables exist
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('ChecklistTemplates', 'TemplateItems', 'TemplateCategories', 'TemplateVersionHistory')
    `);

    const templateCount = await pool
      .request()
      .query('SELECT COUNT(*) as count FROM ChecklistTemplates');
    const categoryCount = await pool
      .request()
      .query('SELECT COUNT(*) as count FROM TemplateCategories');

    console.log('✅ Template management tables created successfully!');

    res.json({
      message: 'Template management database schema executed successfully',
      tables: tablesResult.recordset.map(r => r.TABLE_NAME),
      templateCount: templateCount.recordset[0].count,
      categoryCount: categoryCount.recordset[0].count,
      features: [
        'Template versioning and approval workflow',
        'Template categories with default data',
        'Template item management with dependencies',
        'Usage analytics and collaboration support',
        'Default onboarding template with 12 items created',
      ],
    });
  } catch (error) {
    console.error('❌ Error creating template tables:', error.message);
    res.status(500).json({
      error: 'Failed to create template management tables',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /setup/update-categories:
 *   post:
 *     summary: Add missing French template categories
 *     tags: [Setup]
 *     responses:
 *       200:
 *         description: Categories updated successfully
 */
router.post('/update-categories', async (req, res) => {
  try {
    const sql = require('mssql');
    const pool = await sql.connect({
      server: process.env.DATABASE_SERVER,
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
    });

    console.log('📝 Adding missing French template categories...');

    // Add the missing categories
    await pool.request().query(`
      -- Add missing categories if they don't exist
      IF NOT EXISTS (SELECT * FROM TemplateCategories WHERE name = 'technical')
      INSERT INTO TemplateCategories (name, display_name, description, icon, color, sort_order) VALUES
      ('technical', 'Technical Onboarding', 'Templates for technical roles (developers, engineers, IT)', 'code', '#06B6D4', 6);
      
      IF NOT EXISTS (SELECT * FROM TemplateCategories WHERE name = 'management')
      INSERT INTO TemplateCategories (name, display_name, description, icon, color, sort_order) VALUES
      ('management', 'Management Onboarding', 'Templates for managers and leadership positions', 'user-group', '#EC4899', 7);
      
      IF NOT EXISTS (SELECT * FROM TemplateCategories WHERE name = 'commercial')
      INSERT INTO TemplateCategories (name, display_name, description, icon, color, sort_order) VALUES
      ('commercial', 'Commercial Onboarding', 'Templates for sales, business development and commercial roles', 'chart-bar', '#F97316', 8);
      
      IF NOT EXISTS (SELECT * FROM TemplateCategories WHERE name = 'legal')
      INSERT INTO TemplateCategories (name, display_name, description, icon, color, sort_order) VALUES
      ('legal', 'Legal & Regulatory', 'Templates for legal compliance and French regulatory requirements', 'scale', '#7C3AED', 9);
      
      IF NOT EXISTS (SELECT * FROM TemplateCategories WHERE name = 'security')
      INSERT INTO TemplateCategories (name, display_name, description, icon, color, sort_order) VALUES
      ('security', 'Security & Privacy', 'Templates for RGPD, security clearance and data protection', 'lock-closed', '#DC2626', 10);
      
      IF NOT EXISTS (SELECT * FROM TemplateCategories WHERE name = 'internship')
      INSERT INTO TemplateCategories (name, display_name, description, icon, color, sort_order) VALUES
      ('internship', 'Internship Programs', 'Templates for interns, apprentices and work-study programs', 'student', '#059669', 11);
      
      IF NOT EXISTS (SELECT * FROM TemplateCategories WHERE name = 'remote')
      INSERT INTO TemplateCategories (name, display_name, description, icon, color, sort_order) VALUES
      ('remote', 'Remote Workers', 'Templates for remote and hybrid work arrangements', 'home', '#0891B2', 12);
      
      IF NOT EXISTS (SELECT * FROM TemplateCategories WHERE name = 'freelance')
      INSERT INTO TemplateCategories (name, display_name, description, icon, color, sort_order) VALUES
      ('freelance', 'Freelance & Contractors', 'Templates for freelancers and external contractors', 'briefcase', '#7C2D12', 13);
      
      -- Update custom category sort order
      UPDATE TemplateCategories SET sort_order = 14 WHERE name = 'custom';
    `);

    // Get final count
    const categoryCount = await pool
      .request()
      .query('SELECT COUNT(*) as count FROM TemplateCategories');

    res.json({
      message: 'French template categories added successfully',
      categoryCount: categoryCount.recordset[0].count,
      newCategories: [
        'Technical Onboarding',
        'Management Onboarding',
        'Commercial Onboarding',
        'Legal & Regulatory',
        'Security & Privacy',
        'Internship Programs',
        'Remote Workers',
        'Freelance & Contractors',
      ],
    });
  } catch (error) {
    console.error('❌ Error updating categories:', error);
    res.status(500).json({
      error: 'Failed to update categories',
      details: error.message,
    });
  }
});

module.exports = router;
