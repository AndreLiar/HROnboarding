-- Authentication Database Schema for HR Onboarding System
-- Creates Users and UserSessions tables with proper indexes and constraints

-- Users table for authentication and user management
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

-- UserSessions table for session management and security
CREATE TABLE UserSessions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    token_hash NVARCHAR(255) NOT NULL,
    ip_address NVARCHAR(45),
    user_agent NVARCHAR(500),
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    is_active BIT DEFAULT 1
);

-- Create indexes for performance
CREATE INDEX IX_Users_Email ON Users(email);
CREATE INDEX IX_Users_Role ON Users(role);
CREATE INDEX IX_Users_EmailVerified ON Users(email_verified);
CREATE INDEX IX_Users_IsActive ON Users(is_active);
CREATE INDEX IX_UserSessions_UserId ON UserSessions(user_id);
CREATE INDEX IX_UserSessions_TokenHash ON UserSessions(token_hash);
CREATE INDEX IX_UserSessions_ExpiresAt ON UserSessions(expires_at);
CREATE INDEX IX_UserSessions_IsActive ON UserSessions(is_active);

-- Trigger to update updated_at timestamp on Users table
CREATE TRIGGER tr_Users_UpdatedAt
ON Users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Users 
    SET updated_at = GETUTCDATE()
    FROM Users u
    INNER JOIN inserted i ON u.id = i.id;
END;

-- Create default admin user (password: 'AdminPassword123!')
-- Note: Change this password immediately after first login
INSERT INTO Users (email, password_hash, first_name, last_name, role, email_verified, is_active)
VALUES (
    'admin@hr-onboarding.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/h977aCmK6', -- AdminPassword123!
    'System',
    'Administrator',
    'admin',
    1,
    1
);