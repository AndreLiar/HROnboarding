const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth');
const {
  requireUserAccess,
  requireRoleAssignmentPermission,
  requireAdmin,
  requireHROrAdmin,
} = require('../middleware/rbac');
const { ROLES } = require('../config/permissions');
const AuthService = require('../services/AuthService');

const router = express.Router();

// Validation rules
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Department must be between 2 and 50 characters'),
];

const updateUserValidation = [
  ...updateProfileValidation,
  body('role')
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
];

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    res.json({
      user: req.user,
      permissions: {
        role: req.user.role,
        canManageUsers: req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR_MANAGER,
        canViewAllChecklists: req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR_MANAGER,
        canCreateTemplates: req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR_MANAGER,
        canViewAnalytics: req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR_MANAGER,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve profile',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               department:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', authenticate, updateProfileValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { firstName, lastName, email, department } = req.body;
    const userId = req.user.id;

    const pool = await AuthService.getPool();

    // Build dynamic update query
    const updates = [];
    const params = { user_id: userId };

    if (firstName !== undefined) {
      updates.push('first_name = @first_name');
      params.first_name = firstName;
    }

    if (lastName !== undefined) {
      updates.push('last_name = @last_name');
      params.last_name = lastName;
    }

    if (email !== undefined) {
      // Check if email is already taken by another user
      const emailCheck = await pool
        .request()
        .input('email', email.toLowerCase())
        .input('user_id', userId)
        .query('SELECT id FROM Users WHERE email = @email AND id != @user_id');

      if (emailCheck.recordset.length > 0) {
        return res.status(409).json({
          error: 'Email already exists',
        });
      }

      updates.push('email = @email');
      params.email = email.toLowerCase();
    }

    if (department !== undefined) {
      updates.push('department = @department');
      params.department = department;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
      });
    }

    updates.push('updated_at = GETUTCDATE()');

    const query = `
      UPDATE Users 
      SET ${updates.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @user_id
    `;

    const request = pool.request();
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const updatedUser = AuthService.sanitizeUser(result.recordset[0]);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update profile',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /users/change-password:
 *   post:
 *     summary: Change current user's password
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error or incorrect current password
 *       401:
 *         description: Unauthorized
 */
router.post('/change-password', authenticate, changePasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const pool = await AuthService.getPool();

    // Get current user with password hash
    const userResult = await pool
      .request()
      .input('user_id', userId)
      .query('SELECT password_hash FROM Users WHERE id = @user_id');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const user = userResult.recordset[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Current password is incorrect',
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool
      .request()
      .input('user_id', userId)
      .input('password_hash', hashedNewPassword)
      .input('updated_at', new Date()).query(`
        UPDATE Users 
        SET password_hash = @password_hash, updated_at = @updated_at
        WHERE id = @user_id
      `);

    // Invalidate all existing sessions except current one
    await pool.request().input('user_id', userId).input('current_session_id', req.session.id)
      .query(`
        UPDATE UserSessions 
        SET is_active = 0 
        WHERE user_id = @user_id AND id != @current_session_id AND is_active = 1
      `);

    res.json({
      message: 'Password changed successfully',
      note: 'All other sessions have been invalidated for security',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to change password',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (HR Manager and Admin only)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', authenticate, requireHROrAdmin, async (req, res) => {
  try {
    const { role, department, is_active } = req.query;

    const pool = await AuthService.getPool();

    const whereConditions = [];
    const params = {};

    if (role) {
      whereConditions.push('role = @role');
      params.role = role;
    }

    // Note: department column doesn't exist in current schema
    // if (department) {
    //   whereConditions.push('department = @department');
    //   params.department = department;
    // }

    if (is_active !== undefined) {
      whereConditions.push('is_active = @is_active');
      params.is_active = is_active === 'true';
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id, email, first_name, last_name, role,
        email_verified, is_active, created_at, updated_at, last_login
      FROM Users 
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const request = pool.request();
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });

    const result = await request.query(query);

    res.json({
      users: result.recordset,
      total: result.recordset.length,
      filters: { role, department, is_active },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve users',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Get specific user details
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.get('/:userId', authenticate, requireUserAccess('view'), async (req, res) => {
  try {
    const { userId } = req.params;

    const pool = await AuthService.getPool();

    const result = await pool.request().input('user_id', userId).query(`
        SELECT 
          id, email, first_name, last_name, role,
          email_verified, is_active, created_at, updated_at, last_login
        FROM Users 
        WHERE id = @user_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const user = result.recordset[0];

    res.json({
      user: user,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve user',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /users/{userId}:
 *   put:
 *     summary: Update specific user (Admin and HR Manager only)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *               department:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.put(
  '/:userId',
  authenticate,
  requireUserAccess('edit'),
  updateUserValidation,
  requireRoleAssignmentPermission(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { userId } = req.params;
      const { firstName, lastName, email, role, department, is_active } = req.body;

      const pool = await AuthService.getPool();

      // Build dynamic update query
      const updates = [];
      const params = { user_id: userId };

      if (firstName !== undefined) {
        updates.push('first_name = @first_name');
        params.first_name = firstName;
      }

      if (lastName !== undefined) {
        updates.push('last_name = @last_name');
        params.last_name = lastName;
      }

      if (email !== undefined) {
        // Check if email is already taken by another user
        const emailCheck = await pool
          .request()
          .input('email', email.toLowerCase())
          .input('user_id', userId)
          .query('SELECT id FROM Users WHERE email = @email AND id != @user_id');

        if (emailCheck.recordset.length > 0) {
          return res.status(409).json({
            error: 'Email already exists',
          });
        }

        updates.push('email = @email');
        params.email = email.toLowerCase();
      }

      if (role !== undefined) {
        updates.push('role = @role');
        params.role = role;
      }

      if (department !== undefined) {
        updates.push('department = @department');
        params.department = department;
      }

      if (is_active !== undefined) {
        updates.push('is_active = @is_active');
        params.is_active = is_active;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: 'No fields to update',
        });
      }

      updates.push('updated_at = GETUTCDATE()');

      const query = `
        UPDATE Users 
        SET ${updates.join(', ')}
        OUTPUT INSERTED.*
        WHERE id = @user_id
      `;

      const request = pool.request();
      Object.keys(params).forEach(key => {
        request.input(key, params[key]);
      });

      const result = await request.query(query);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      const updatedUser = AuthService.sanitizeUser(result.recordset[0]);

      res.json({
        message: 'User updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to update user',
        details: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /users/{userId}/deactivate:
 *   post:
 *     summary: Deactivate user (Admin only)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.post('/:userId/deactivate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent self-deactivation
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Cannot deactivate your own account',
      });
    }

    const pool = await AuthService.getPool();

    const result = await pool.request().input('user_id', userId).query(`
        UPDATE Users 
        SET is_active = 0, updated_at = GETUTCDATE()
        OUTPUT INSERTED.*
        WHERE id = @user_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Deactivate all user sessions
    await pool.request().input('user_id', userId).query(`
        UPDATE UserSessions 
        SET is_active = 0 
        WHERE user_id = @user_id AND is_active = 1
      `);

    const deactivatedUser = AuthService.sanitizeUser(result.recordset[0]);

    res.json({
      message: 'User deactivated successfully',
      user: deactivatedUser,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to deactivate user',
      details: error.message,
    });
  }
});

module.exports = router;
