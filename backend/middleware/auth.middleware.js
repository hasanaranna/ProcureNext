import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';

/**
 * Authenticate JWT token and populate req.user with full context.
 * req.user = { id, email, status, organization_id?, role_in_org?, org_user_id? }
 */
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid JWT token.',
        status: 401
      }
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret);

    // Fetch full user context (including org membership if any)
    const userResult = await pool.query(
      `SELECT u.user_id, u.email, u.status, u.full_name,
              oe.org_user_id, oe.organization_id, oe.role_in_org,
              o.organization_name
       FROM users u
       LEFT JOIN organization_employees oe ON oe.user_id = u.user_id
       LEFT JOIN organizations o ON o.organization_id = oe.organization_id
       WHERE u.user_id = $1
       LIMIT 1`,
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found.',
          status: 401
        }
      });
    }

    const row = userResult.rows[0];
    req.user = {
      id: row.user_id,
      email: row.email,
      full_name: row.full_name,
      status: row.status,
      org_user_id: row.org_user_id || null,
      organization_id: row.organization_id || null,
      organization_name: row.organization_name || null,
      role_in_org: row.role_in_org || null,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid JWT token.',
        status: 401
      }
    });
  }
};

/**
 * Middleware: require the authenticated user to have the 'Owner' role in their org.
 */
export const requireOwner = (req, res, next) => {
  if (!req.user || req.user.role_in_org !== 'Owner') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only the organization owner can perform this action.',
        status: 403
      }
    });
  }
  next();
};

/**
 * Middleware: require the authenticated user to have 'Active' status.
 */
export const requireActiveStatus = (req, res, next) => {
  if (!req.user || req.user.status !== 'Active') {
    return res.status(403).json({
      error: {
        code: 'ACCOUNT_PENDING',
        message: 'Your account is not yet active. Please wait for admin approval.',
        status: 403
      }
    });
  }
  next();
};