// Role-Based Access Control (RBAC) Configuration
// Defines permissions and capabilities for each user role

const ROLES = {
  ADMIN: 'admin',
  HR_MANAGER: 'hr_manager',
  EMPLOYEE: 'employee',
};

const PERMISSIONS = {
  // User Management
  USERS_CREATE: 'users:create',
  USERS_READ_ALL: 'users:read:all',
  USERS_READ_OWN: 'users:read:own',
  USERS_UPDATE_ALL: 'users:update:all',
  USERS_UPDATE_OWN: 'users:update:own',
  USERS_DELETE: 'users:delete',
  USERS_ASSIGN_ROLES: 'users:assign_roles',

  // Checklist Management
  CHECKLISTS_CREATE: 'checklists:create',
  CHECKLISTS_READ_ALL: 'checklists:read:all',
  CHECKLISTS_READ_OWN: 'checklists:read:own',
  CHECKLISTS_UPDATE_ALL: 'checklists:update:all',
  CHECKLISTS_UPDATE_OWN: 'checklists:update:own',
  CHECKLISTS_DELETE_ALL: 'checklists:delete:all',
  CHECKLISTS_DELETE_OWN: 'checklists:delete:own',
  CHECKLISTS_ASSIGN: 'checklists:assign',

  // Template Management
  TEMPLATES_CREATE: 'templates:create',
  TEMPLATES_VIEW: 'templates:view',
  TEMPLATES_READ: 'templates:read',
  TEMPLATES_EDIT: 'templates:edit',
  TEMPLATES_DELETE: 'templates:delete',
  TEMPLATES_APPROVE: 'templates:approve',
  TEMPLATES_CLONE: 'templates:clone',

  // Analytics & Reporting
  ANALYTICS_VIEW: 'analytics:view',
  REPORTS_GENERATE: 'reports:generate',
  REPORTS_EXPORT: 'reports:export',

  // System Administration
  SYSTEM_SETTINGS: 'system:settings',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_BACKUP: 'system:backup',

  // Session Management
  SESSIONS_VIEW_ALL: 'sessions:view:all',
  SESSIONS_VIEW_OWN: 'sessions:view:own',
  SESSIONS_TERMINATE_ALL: 'sessions:terminate:all',
  SESSIONS_TERMINATE_OWN: 'sessions:terminate:own',
};

// Role Permission Mappings
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Full system access
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_READ_ALL,
    PERMISSIONS.USERS_READ_OWN,
    PERMISSIONS.USERS_UPDATE_ALL,
    PERMISSIONS.USERS_UPDATE_OWN,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_ASSIGN_ROLES,

    PERMISSIONS.CHECKLISTS_CREATE,
    PERMISSIONS.CHECKLISTS_READ_ALL,
    PERMISSIONS.CHECKLISTS_READ_OWN,
    PERMISSIONS.CHECKLISTS_UPDATE_ALL,
    PERMISSIONS.CHECKLISTS_UPDATE_OWN,
    PERMISSIONS.CHECKLISTS_DELETE_ALL,
    PERMISSIONS.CHECKLISTS_DELETE_OWN,
    PERMISSIONS.CHECKLISTS_ASSIGN,

    PERMISSIONS.TEMPLATES_CREATE,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.TEMPLATES_READ,
    PERMISSIONS.TEMPLATES_EDIT,
    PERMISSIONS.TEMPLATES_DELETE,
    PERMISSIONS.TEMPLATES_APPROVE,
    PERMISSIONS.TEMPLATES_CLONE,

    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_EXPORT,

    PERMISSIONS.SYSTEM_SETTINGS,
    PERMISSIONS.SYSTEM_LOGS,
    PERMISSIONS.SYSTEM_BACKUP,

    PERMISSIONS.SESSIONS_VIEW_ALL,
    PERMISSIONS.SESSIONS_VIEW_OWN,
    PERMISSIONS.SESSIONS_TERMINATE_ALL,
    PERMISSIONS.SESSIONS_TERMINATE_OWN,
  ],

  [ROLES.HR_MANAGER]: [
    // HR operations and team management
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_READ_ALL,
    PERMISSIONS.USERS_READ_OWN,
    PERMISSIONS.USERS_UPDATE_ALL,
    PERMISSIONS.USERS_UPDATE_OWN,

    PERMISSIONS.CHECKLISTS_CREATE,
    PERMISSIONS.CHECKLISTS_READ_ALL,
    PERMISSIONS.CHECKLISTS_READ_OWN,
    PERMISSIONS.CHECKLISTS_UPDATE_ALL,
    PERMISSIONS.CHECKLISTS_UPDATE_OWN,
    PERMISSIONS.CHECKLISTS_DELETE_ALL,
    PERMISSIONS.CHECKLISTS_DELETE_OWN,
    PERMISSIONS.CHECKLISTS_ASSIGN,

    PERMISSIONS.TEMPLATES_CREATE,
    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.TEMPLATES_READ,
    PERMISSIONS.TEMPLATES_EDIT,
    PERMISSIONS.TEMPLATES_DELETE,
    PERMISSIONS.TEMPLATES_APPROVE,
    PERMISSIONS.TEMPLATES_CLONE,

    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_EXPORT,

    PERMISSIONS.SESSIONS_VIEW_OWN,
    PERMISSIONS.SESSIONS_TERMINATE_OWN,
  ],

  [ROLES.EMPLOYEE]: [
    // Self-service and assigned tasks only
    PERMISSIONS.USERS_READ_OWN,
    PERMISSIONS.USERS_UPDATE_OWN,

    PERMISSIONS.CHECKLISTS_READ_OWN,
    PERMISSIONS.CHECKLISTS_UPDATE_OWN,

    PERMISSIONS.TEMPLATES_VIEW,
    PERMISSIONS.TEMPLATES_READ,

    PERMISSIONS.SESSIONS_VIEW_OWN,
    PERMISSIONS.SESSIONS_TERMINATE_OWN,
  ],
};

// Resource Access Patterns
const RESOURCE_ACCESS = {
  PUBLIC: 'public', // No authentication required
  AUTHENTICATED: 'authenticated', // Any authenticated user
  OWNER_ONLY: 'owner', // Resource owner only
  SAME_DEPARTMENT: 'department', // Same department users
  HR_AND_ABOVE: 'hr_plus', // HR Manager and Admin
  ADMIN_ONLY: 'admin', // Admin only
};

// Department-based access (for future multi-tenancy)
const DEPARTMENT_PERMISSIONS = {
  HR: {
    canViewAllEmployees: true,
    canCreateChecklists: true,
    canAssignTasks: true,
  },
  IT: {
    canViewTechChecklists: true,
    canManageAccounts: true,
  },
  FINANCE: {
    canViewBudgetData: true,
    canProcessPayroll: true,
  },
};

/**
 * Check if a user has a specific permission
 * @param {string} userRole - User's role
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether user has permission
 */
function hasPermission(userRole, permission) {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user can access a resource
 * @param {Object} user - User object with role
 * @param {string} resourceType - Type of resource
 * @param {Object} resource - Resource object (optional)
 * @param {string} accessType - Type of access required
 * @returns {boolean} - Whether user can access resource
 */
function canAccessResource(
  user,
  resourceType,
  resource = null,
  accessType = RESOURCE_ACCESS.AUTHENTICATED
) {
  if (!user) return accessType === RESOURCE_ACCESS.PUBLIC;

  switch (accessType) {
    case RESOURCE_ACCESS.PUBLIC:
      return true;

    case RESOURCE_ACCESS.AUTHENTICATED:
      return !!user.id;

    case RESOURCE_ACCESS.OWNER_ONLY:
      return resource && (resource.user_id === user.id || resource.created_by === user.id);

    case RESOURCE_ACCESS.SAME_DEPARTMENT:
      return resource && resource.department === user.department;

    case RESOURCE_ACCESS.HR_AND_ABOVE:
      return user.role === ROLES.HR_MANAGER || user.role === ROLES.ADMIN;

    case RESOURCE_ACCESS.ADMIN_ONLY:
      return user.role === ROLES.ADMIN;

    default:
      return false;
  }
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {Array} - Array of permissions
 */
function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role has higher or equal privileges than another role
 * @param {string} role1 - First role
 * @param {string} role2 - Second role
 * @returns {boolean} - Whether role1 >= role2 in hierarchy
 */
function isRoleHigherOrEqual(role1, role2) {
  const hierarchy = {
    [ROLES.EMPLOYEE]: 1,
    [ROLES.HR_MANAGER]: 2,
    [ROLES.ADMIN]: 3,
  };

  return (hierarchy[role1] || 0) >= (hierarchy[role2] || 0);
}

/**
 * Validate role assignment
 * @param {string} assignerRole - Role of user making assignment
 * @param {string} targetRole - Role being assigned
 * @returns {boolean} - Whether assignment is allowed
 */
function canAssignRole(assignerRole, targetRole) {
  // Only admins can assign admin role
  if (targetRole === ROLES.ADMIN) {
    return assignerRole === ROLES.ADMIN;
  }

  // HR managers and admins can assign HR manager and employee roles
  if (targetRole === ROLES.HR_MANAGER || targetRole === ROLES.EMPLOYEE) {
    return assignerRole === ROLES.HR_MANAGER || assignerRole === ROLES.ADMIN;
  }

  return false;
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  RESOURCE_ACCESS,
  DEPARTMENT_PERMISSIONS,
  hasPermission,
  canAccessResource,
  getRolePermissions,
  isRoleHigherOrEqual,
  canAssignRole,
};
