const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sql = require('mssql');

class AuthService {
  constructor() {
    this.saltRounds = 12;
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.jwtExpiry = process.env.JWT_EXPIRY || '7d';
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
  }

  async getPool() {
    try {
      return await sql.connect({
        server: process.env.DATABASE_SERVER,
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        options: {
          encrypt: true,
          trustServerCertificate: false,
        },
      });
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  async register(userData) {
    const { email, password, firstName, lastName, role = 'employee' } = userData;

    try {
      const pool = await this.getPool();

      // Check if user already exists
      const existingUser = await pool
        .request()
        .input('email', email.toLowerCase())
        .query('SELECT id FROM Users WHERE email = @email');

      if (existingUser.recordset.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);

      // Create user
      const result = await pool
        .request()
        .input('email', email.toLowerCase())
        .input('password_hash', hashedPassword)
        .input('first_name', firstName)
        .input('last_name', lastName)
        .input('role', role).query(`
          INSERT INTO Users (email, password_hash, first_name, last_name, role)
          OUTPUT INSERTED.*
          VALUES (@email, @password_hash, @first_name, @last_name, @role)
        `);

      const user = result.recordset[0];
      return this.sanitizeUser(user);
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  async login(email, password, ipAddress, userAgent) {
    try {
      const pool = await this.getPool();

      // Get user with login attempt info
      const userResult = await pool.request().input('email', email.toLowerCase()).query(`
          SELECT * FROM Users 
          WHERE email = @email AND is_active = 1
        `);

      const user = userResult.recordset[0];

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if account is locked
      if (user.locked_until && new Date() < new Date(user.locked_until)) {
        const lockTimeRemaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        throw new Error(`Account locked. Try again in ${lockTimeRemaining} minutes`);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        // Increment login attempts
        await this.incrementLoginAttempts(user.id);
        throw new Error('Invalid email or password');
      }

      // Generate JWT token first for faster response
      const token = this.generateToken(user);

      // Batch database operations for better performance
      const tokenHash = this.hashToken(token);
      const expiresAt = new Date(Date.now() + this.parseExpiry(this.jwtExpiry));

      const sessionResult = await pool
        .request()
        .input('user_id', user.id)
        .input('token_hash', tokenHash)
        .input('ip_address', ipAddress || null)
        .input('user_agent', userAgent || null)
        .input('expires_at', expiresAt).query(`
          -- Reset login attempts and update last login
          UPDATE Users 
          SET login_attempts = 0, locked_until = NULL, last_login = GETUTCDATE()
          WHERE id = @user_id;
          
          -- Create session record
          INSERT INTO UserSessions (user_id, token_hash, ip_address, user_agent, expires_at)
          OUTPUT INSERTED.id
          VALUES (@user_id, @token_hash, @ip_address, @user_agent, @expires_at);
        `);

      const sessionId = sessionResult.recordset[0]?.id;

      return {
        user: this.sanitizeUser(user),
        token,
        sessionId,
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async logout(sessionId) {
    try {
      const pool = await this.getPool();

      await pool
        .request()
        .input('session_id', sessionId)
        .query('UPDATE UserSessions SET is_active = 0 WHERE id = @session_id');

      return { message: 'Logged out successfully' };
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);

      const pool = await this.getPool();

      // Check if session is still active
      const sessionResult = await pool
        .request()
        .input('user_id', decoded.userId)
        .input('token_hash', this.hashToken(token)).query(`
          SELECT s.*, u.is_active as user_active 
          FROM UserSessions s
          JOIN Users u ON s.user_id = u.id
          WHERE s.user_id = @user_id 
          AND s.token_hash = @token_hash 
          AND s.is_active = 1 
          AND s.expires_at > GETUTCDATE()
          AND u.is_active = 1
        `);

      if (sessionResult.recordset.length === 0) {
        throw new Error('Invalid or expired session');
      }

      // Get fresh user data
      const userResult = await pool
        .request()
        .input('user_id', decoded.userId)
        .query('SELECT * FROM Users WHERE id = @user_id AND is_active = 1');

      if (userResult.recordset.length === 0) {
        throw new Error('User not found or inactive');
      }

      return {
        user: this.sanitizeUser(userResult.recordset[0]),
        session: sessionResult.recordset[0],
      };
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  async refreshToken(oldToken) {
    try {
      const { user } = await this.verifyToken(oldToken);

      // Generate new token
      const newToken = this.generateToken(user);

      // Update session with new token
      const pool = await this.getPool();
      await pool
        .request()
        .input('user_id', user.id)
        .input('old_token_hash', this.hashToken(oldToken))
        .input('new_token_hash', this.hashToken(newToken))
        .input('expires_at', new Date(Date.now() + this.parseExpiry(this.jwtExpiry))).query(`
          UPDATE UserSessions 
          SET token_hash = @new_token_hash, expires_at = @expires_at
          WHERE user_id = @user_id AND token_hash = @old_token_hash AND is_active = 1
        `);

      return {
        user: this.sanitizeUser(user),
        token: newToken,
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiry,
      issuer: 'hr-onboarding-api',
      audience: 'hr-onboarding-client',
    });
  }

  async createSession(userId, token, ipAddress, userAgent) {
    try {
      const pool = await this.getPool();

      const tokenHash = this.hashToken(token);
      const expiresAt = new Date(Date.now() + this.parseExpiry(this.jwtExpiry));

      const result = await pool
        .request()
        .input('user_id', userId)
        .input('token_hash', tokenHash)
        .input('ip_address', ipAddress || null)
        .input('user_agent', userAgent || null)
        .input('expires_at', expiresAt).query(`
          INSERT INTO UserSessions (user_id, token_hash, ip_address, user_agent, expires_at)
          OUTPUT INSERTED.id
          VALUES (@user_id, @token_hash, @ip_address, @user_agent, @expires_at)
        `);

      return result.recordset[0].id;
    } catch (error) {
      throw new Error(`Session creation failed: ${error.message}`);
    }
  }

  async incrementLoginAttempts(userId) {
    try {
      const pool = await this.getPool();

      const result = await pool.request().input('user_id', userId).query(`
          UPDATE Users 
          SET login_attempts = login_attempts + 1,
              locked_until = CASE 
                WHEN login_attempts + 1 >= ${this.maxLoginAttempts} 
                THEN DATEADD(MINUTE, 15, GETUTCDATE())
                ELSE NULL 
              END
          OUTPUT INSERTED.login_attempts, INSERTED.locked_until
          WHERE id = @user_id
        `);

      return result.recordset[0];
    } catch (error) {
      console.error('Error incrementing login attempts:', error);
    }
  }

  async resetLoginAttempts(userId) {
    try {
      const pool = await this.getPool();

      await pool.request().input('user_id', userId).query(`
          UPDATE Users 
          SET login_attempts = 0, locked_until = NULL 
          WHERE id = @user_id
        `);
    } catch (error) {
      console.error('Error resetting login attempts:', error);
    }
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  parseExpiry(expiry) {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000; // 7 days default
    }
  }

  sanitizeUser(user) {
    // eslint-disable-next-line no-unused-vars
    const { password_hash, password_reset_token, login_attempts, locked_until, ...sanitized } =
      user;
    return sanitized;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }
}

module.exports = new AuthService();
