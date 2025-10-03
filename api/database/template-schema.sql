-- Advanced Template Management Schema
-- Supports versioning, categories, approval workflows, and bulk operations

-- Main template table with versioning and approval workflow
CREATE TABLE ChecklistTemplates (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    description NTEXT,
    category NVARCHAR(100) NOT NULL, -- 'onboarding', 'offboarding', 'compliance', 'training', 'custom'
    version INT DEFAULT 1,
    status NVARCHAR(50) DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'archived'
    created_by UNIQUEIDENTIFIER REFERENCES Users(id),
    approved_by UNIQUEIDENTIFIER REFERENCES Users(id),
    approved_at DATETIME2,
    template_data NTEXT NOT NULL, -- JSON checklist structure
    tags NVARCHAR(500), -- comma-separated searchable tags
    is_default BIT DEFAULT 0, -- default template for category
    is_public BIT DEFAULT 1, -- visible to all users
    usage_count INT DEFAULT 0, -- track template popularity
    estimated_duration_minutes INT, -- estimated completion time
    target_roles NVARCHAR(200), -- JSON array of applicable roles
    target_departments NVARCHAR(200), -- JSON array of applicable departments
    compliance_frameworks NVARCHAR(200), -- JSON array (ISO27001, SOX, GDPR, etc.)
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Individual checklist items within templates
CREATE TABLE TemplateItems (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    template_id UNIQUEIDENTIFIER REFERENCES ChecklistTemplates(id) ON DELETE CASCADE,
    title NVARCHAR(500) NOT NULL,
    description NTEXT,
    category NVARCHAR(100), -- 'documentation', 'training', 'system_access', 'equipment'
    is_required BIT DEFAULT 1,
    estimated_duration_minutes INT DEFAULT 30,
    sort_order INT NOT NULL,
    dependencies NTEXT, -- JSON array of dependent item IDs within same template
    assignee_role NVARCHAR(100) DEFAULT 'employee', -- 'hr', 'it', 'manager', 'employee'
    due_days_from_start INT DEFAULT 1, -- days from checklist start date
    instructions NTEXT, -- detailed instructions for completion
    success_criteria NTEXT, -- what constitutes completion
    attachments_required BIT DEFAULT 0, -- whether attachments are required
    approval_required BIT DEFAULT 0, -- whether manager approval is needed
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Template categories with metadata
CREATE TABLE TemplateCategories (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) UNIQUE NOT NULL,
    display_name NVARCHAR(255) NOT NULL,
    description NTEXT,
    icon NVARCHAR(100), -- icon class name
    color NVARCHAR(7), -- hex color code
    sort_order INT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_by UNIQUEIDENTIFIER REFERENCES Users(id),
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Template version history for auditing and rollback
CREATE TABLE TemplateVersionHistory (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    template_id UNIQUEIDENTIFIER REFERENCES ChecklistTemplates(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    name NVARCHAR(255),
    description NTEXT,
    template_data NTEXT, -- JSON snapshot of template at this version
    changes_summary NTEXT, -- description of what changed
    created_by UNIQUEIDENTIFIER REFERENCES Users(id),
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Template approval workflow
CREATE TABLE TemplateApprovalRequests (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    template_id UNIQUEIDENTIFIER REFERENCES ChecklistTemplates(id) ON DELETE CASCADE,
    requested_by UNIQUEIDENTIFIER REFERENCES Users(id),
    assigned_to UNIQUEIDENTIFIER REFERENCES Users(id), -- approver
    status NVARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    comments NTEXT,
    changes_requested NTEXT, -- specific feedback for improvements
    responded_at DATETIME2,
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Template usage analytics
CREATE TABLE TemplateUsage (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    template_id UNIQUEIDENTIFIER REFERENCES ChecklistTemplates(id),
    used_by UNIQUEIDENTIFIER REFERENCES Users(id),
    checklist_instance_id UNIQUEIDENTIFIER, -- will reference ChecklistInstances when created
    usage_context NVARCHAR(100), -- 'new_hire', 'promotion', 'compliance_check'
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Template sharing and collaboration
CREATE TABLE TemplateCollaborators (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    template_id UNIQUEIDENTIFIER REFERENCES ChecklistTemplates(id) ON DELETE CASCADE,
    user_id UNIQUEIDENTIFIER REFERENCES Users(id),
    permission_level NVARCHAR(50), -- 'view', 'edit', 'admin'
    added_by UNIQUEIDENTIFIER REFERENCES Users(id),
    added_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Indexes for performance
CREATE INDEX IX_ChecklistTemplates_Category ON ChecklistTemplates(category);
CREATE INDEX IX_ChecklistTemplates_Status ON ChecklistTemplates(status);
CREATE INDEX IX_ChecklistTemplates_CreatedBy ON ChecklistTemplates(created_by);
CREATE INDEX IX_ChecklistTemplates_Tags ON ChecklistTemplates(tags);
CREATE INDEX IX_ChecklistTemplates_IsDefault ON ChecklistTemplates(is_default);
CREATE INDEX IX_TemplateItems_TemplateId ON TemplateItems(template_id);
CREATE INDEX IX_TemplateItems_SortOrder ON TemplateItems(template_id, sort_order);
CREATE INDEX IX_TemplateUsage_TemplateId ON TemplateUsage(template_id);
CREATE INDEX IX_TemplateUsage_CreatedAt ON TemplateUsage(created_at);

-- Trigger to update template updated_at timestamp
CREATE TRIGGER tr_ChecklistTemplates_UpdatedAt
ON ChecklistTemplates
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE ChecklistTemplates 
    SET updated_at = GETUTCDATE()
    FROM ChecklistTemplates t
    INNER JOIN inserted i ON t.id = i.id;
END;

-- Insert default template categories
INSERT INTO TemplateCategories (name, display_name, description, icon, color, sort_order) VALUES
('onboarding', 'Employee Onboarding', 'Templates for new employee onboarding process', 'user-plus', '#10B981', 1),
('offboarding', 'Employee Offboarding', 'Templates for employee departure process', 'user-minus', '#EF4444', 2),
('compliance', 'Compliance & Training', 'Templates for regulatory compliance and mandatory training', 'shield-check', '#F59E0B', 3),
('training', 'Skills Training', 'Templates for professional development and training programs', 'academic-cap', '#3B82F6', 4),
('equipment', 'Equipment & Access', 'Templates for equipment setup and system access provisioning', 'desktop-computer', '#8B5CF6', 5),
('custom', 'Custom Workflows', 'Organization-specific custom workflow templates', 'cog', '#6B7280', 6);

-- Create a default onboarding template
DECLARE @templateId UNIQUEIDENTIFIER = NEWID();
DECLARE @adminUserId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM Users WHERE role = 'admin');

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
    480, -- 8 hours estimated
    '["employee", "manager", "contractor"]',
    '["HR", "IT", "Operations"]',
    '["GDPR", "SOX"]'
);

-- Insert template items for the default template
INSERT INTO TemplateItems (template_id, title, description, category, sort_order, assignee_role, due_days_from_start, estimated_duration_minutes, is_required, approval_required) VALUES
(@templateId, 'Complete Employment Documentation', 'Fill out all required employment forms, contracts, and legal documentation', 'documentation', 1, 'hr', 1, 60, 1, 0),
(@templateId, 'Employee Handbook Review', 'Read and acknowledge receipt of employee handbook and company policies', 'training', 2, 'employee', 2, 90, 1, 0),
(@templateId, 'IT Equipment Setup', 'Provision laptop, phone, and other necessary equipment', 'equipment', 3, 'it', 1, 45, 1, 0),
(@templateId, 'System Access Provisioning', 'Create accounts and provide access to necessary systems and applications', 'equipment', 4, 'it', 2, 30, 1, 0),
(@templateId, 'Security Training Completion', 'Complete mandatory cybersecurity awareness training', 'training', 5, 'employee', 5, 120, 1, 1),
(@templateId, 'Team Introduction Meeting', 'Schedule and attend introduction meeting with immediate team members', 'training', 6, 'manager', 3, 60, 1, 0),
(@templateId, 'Benefits Enrollment', 'Complete health insurance, retirement, and other benefits enrollment', 'documentation', 7, 'hr', 7, 45, 1, 0),
(@templateId, 'Direct Deposit Setup', 'Provide banking information for payroll direct deposit', 'documentation', 8, 'hr', 7, 15, 1, 0),
(@templateId, 'Emergency Contact Information', 'Provide emergency contact details for company records', 'documentation', 9, 'hr', 1, 10, 1, 0),
(@templateId, 'Workspace Setup', 'Set up physical workspace including desk, chair, and office supplies', 'equipment', 10, 'manager', 1, 30, 1, 0),
(@templateId, 'Role-Specific Training Plan', 'Create and begin role-specific training and development plan', 'training', 11, 'manager', 10, 180, 1, 1),
(@templateId, '30-Day Check-in Meeting', 'Schedule 30-day performance and satisfaction check-in with HR', 'training', 12, 'hr', 30, 60, 1, 0);