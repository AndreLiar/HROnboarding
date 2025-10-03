const {
  ROLES,
  PERMISSIONS,
  RESOURCE_ACCESS,
  hasPermission,
  canAccessResource,
  isRoleHigherOrEqual,
  canAssignRole,
} = require('../config/permissions');

/**
 * Middleware to check if user has specific permission
 * @param {string|Array} requiredPermissions - Permission(s) required
 * @param {string} logic - 'AND' or 'OR' for multiple permissions (default: 'OR')
 */
const requirePermission = (requiredPermissions, logic = 'OR') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];
    const userRole = req.user.role;

    let hasAccess;
    if (logic === 'AND') {
      hasAccess = permissions.every(permission => hasPermission(userRole, permission));
    } else {
      hasAccess = permissions.some(permission => hasPermission(userRole, permission));
    }

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
        userRole: userRole,
        logic: logic,
      });
    }

    next();
  };
};

/**
 * Middleware to check resource access based on ownership or role
 * @param {string} resourceType - Type of resource being accessed
 * @param {string} accessType - Type of access required
 * @param {Function} resourceGetter - Function to get resource (optional)
 */
const requireResourceAccess = (
  resourceType,
  accessType = RESOURCE_ACCESS.AUTHENTICATED,
  resourceGetter = null
) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    try {
      let resource = null;

      // Get resource if getter function provided
      if (resourceGetter && typeof resourceGetter === 'function') {
        resource = await resourceGetter(req);
      }

      const hasAccess = canAccessResource(req.user, resourceType, resource, accessType);

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to resource',
          code: 'RESOURCE_ACCESS_DENIED',
          resourceType: resourceType,
          accessType: accessType,
          userRole: req.user.role,
        });
      }

      // Attach resource to request for controller use
      if (resource) {
        req.resource = resource;
      }

      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Error checking resource access',
        code: 'RESOURCE_ACCESS_ERROR',
        details: error.message,
      });
    }
  };
};

/**
 * Middleware to check if user can perform action on another user
 * @param {string} action - Action being performed ('view', 'edit', 'delete', 'assign_role')
 */
const requireUserAccess = action => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const targetUserId = req.params.userId || req.params.id;
    const currentUser = req.user;

    // Self-access is always allowed for view and edit
    if (targetUserId === currentUser.id && ['view', 'edit'].includes(action)) {
      return next();
    }

    // Check permissions based on action
    switch (action) {
      case 'view':
        if (hasPermission(currentUser.role, PERMISSIONS.USERS_READ_ALL)) {
          return next();
        }
        break;

      case 'edit':
        if (hasPermission(currentUser.role, PERMISSIONS.USERS_UPDATE_ALL)) {
          return next();
        }
        break;

      case 'delete':
        if (hasPermission(currentUser.role, PERMISSIONS.USERS_DELETE)) {
          return next();
        }
        break;

      case 'assign_role':
        if (hasPermission(currentUser.role, PERMISSIONS.USERS_ASSIGN_ROLES)) {
          return next();
        }
        break;

      default:
        return res.status(400).json({
          error: 'Invalid action specified',
          code: 'INVALID_ACTION',
        });
    }

    return res.status(403).json({
      error: `Access denied for ${action} action on user`,
      code: 'USER_ACCESS_DENIED',
      action: action,
      userRole: currentUser.role,
    });
  };
};

/**
 * Middleware to validate role assignment permissions
 */
const requireRoleAssignmentPermission = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const { role: newRole } = req.body;
    const assignerRole = req.user.role;

    if (!newRole) {
      return res.status(400).json({
        error: 'Role is required',
        code: 'ROLE_REQUIRED',
      });
    }

    if (!Object.values(ROLES).includes(newRole)) {
      return res.status(400).json({
        error: 'Invalid role specified',
        code: 'INVALID_ROLE',
        validRoles: Object.values(ROLES),
      });
    }

    if (!canAssignRole(assignerRole, newRole)) {
      return res.status(403).json({
        error: 'Cannot assign this role',
        code: 'ROLE_ASSIGNMENT_DENIED',
        assignerRole: assignerRole,
        targetRole: newRole,
      });
    }

    next();
  };
};

/**
 * Middleware for department-based access control
 * @param {boolean} requireSameDepartment - Whether to require same department
 */
const requireDepartmentAccess = (requireSameDepartment = false) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Admins bypass department restrictions
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    if (requireSameDepartment) {
      const targetDepartment = req.params.department || req.body.department || req.query.department;

      if (targetDepartment && targetDepartment !== req.user.department) {
        return res.status(403).json({
          error: 'Access denied to different department',
          code: 'DEPARTMENT_ACCESS_DENIED',
          userDepartment: req.user.department,
          targetDepartment: targetDepartment,
        });
      }
    }

    next();
  };
};

/**
 * Middleware to check if user has higher or equal role than target
 * @param {string} targetRoleSource - Where to get target role ('params', 'body', 'query')
 */
const requireHigherOrEqualRole = (targetRoleSource = 'body') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    let targetRole;
    switch (targetRoleSource) {
      case 'params':
        targetRole = req.params.role;
        break;
      case 'body':
        targetRole = req.body.role;
        break;
      case 'query':
        targetRole = req.query.role;
        break;
      default:
        return res.status(400).json({
          error: 'Invalid target role source',
          code: 'INVALID_ROLE_SOURCE',
        });
    }

    if (!targetRole) {
      return next(); // No role to check against
    }

    if (!isRoleHigherOrEqual(req.user.role, targetRole)) {
      return res.status(403).json({
        error: 'Insufficient role hierarchy',
        code: 'INSUFFICIENT_ROLE_HIERARCHY',
        userRole: req.user.role,
        targetRole: targetRole,
      });
    }

    next();
  };
};

/**
 * Create a resource access checker for specific resources
 * @param {string} resourceName - Name of the resource
 * @param {Function} resourceQuery - Function to query the resource
 */
const createResourceAccessChecker = (resourceName, resourceQuery) => {
  return (accessType = RESOURCE_ACCESS.OWNER_ONLY) => {
    return async (req, res, next) => {
      try {
        const resourceId = req.params.id || req.params[`${resourceName}Id`];

        if (!resourceId) {
          return res.status(400).json({
            error: `${resourceName} ID is required`,
            code: 'RESOURCE_ID_REQUIRED',
          });
        }

        const resource = await resourceQuery(resourceId);

        if (!resource) {
          return res.status(404).json({
            error: `${resourceName} not found`,
            code: 'RESOURCE_NOT_FOUND',
          });
        }

        const hasAccess = canAccessResource(req.user, resourceName, resource, accessType);

        if (!hasAccess) {
          return res.status(403).json({
            error: `Access denied to ${resourceName}`,
            code: 'RESOURCE_ACCESS_DENIED',
            resourceType: resourceName,
          });
        }

        req[resourceName] = resource;
        next();
      } catch (error) {
        return res.status(500).json({
          error: `Error accessing ${resourceName}`,
          code: 'RESOURCE_ACCESS_ERROR',
          details: error.message,
        });
      }
    };
  };
};

// Pre-configured common middleware
const requireAdmin = requirePermission(
  [PERMISSIONS.SYSTEM_SETTINGS, PERMISSIONS.USERS_DELETE, PERMISSIONS.USERS_ASSIGN_ROLES],
  'OR'
);

const requireHROrAdmin = requirePermission(
  [PERMISSIONS.USERS_READ_ALL, PERMISSIONS.CHECKLISTS_ASSIGN, PERMISSIONS.REPORTS_GENERATE],
  'OR'
);

const requireAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }
  next();
};

module.exports = {
  requirePermission,
  requireResourceAccess,
  requireUserAccess,
  requireRoleAssignmentPermission,
  requireDepartmentAccess,
  requireHigherOrEqualRole,
  createResourceAccessChecker,

  // Pre-configured middleware
  requireAdmin,
  requireHROrAdmin,
  requireAuthenticated,
};
