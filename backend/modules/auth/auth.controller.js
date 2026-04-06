import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/db.js';
import { env } from '../../config/env.js';
import crypto from 'crypto';

// ─── Helper: generate tokens ────────────────────────────────
function generateTokens(userId) {
  const accessToken = jwt.sign({ id: userId }, env.jwtAccessSecret, { expiresIn: 3600 });
  const refreshToken = jwt.sign({ id: userId }, env.jwtRefreshSecret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// ─── Helper: fetch user context for response ────────────────
async function fetchUserContext(userId) {
  const result = await pool.query(
    `SELECT u.user_id, u.email, u.full_name, u.nid, u.date_of_birth, u.phone, u.status, u.created_at,
            oe.org_user_id, oe.organization_id, oe.role_in_org,
            o.organization_name
     FROM users u
     LEFT JOIN organization_employees oe ON oe.user_id = u.user_id
     LEFT JOIN organizations o ON o.organization_id = oe.organization_id
     WHERE u.user_id = $1
     LIMIT 1`,
    [userId]
  );
  const row = result.rows[0];
  return {
    id: row.user_id,
    email: row.email,
    full_name: row.full_name,
    nid: row.nid,
    date_of_birth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().split('T')[0] : null,
    phone: row.phone,
    status: row.status,
    created_at: row.created_at,
    organization_id: row.organization_id || null,
    organization_name: row.organization_name || null,
    role_in_org: row.role_in_org || null,
    org_user_id: row.org_user_id || null,
  };
}

// ─── Register Master Account ────────────────────────────────
export const registerMaster = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { email, nid, date_of_birth, password, phone, name, organizationName } = req.body;

    // Validation
    const errors = [];
    if (!password || password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
    }
    if (!email) errors.push({ field: 'email', message: 'Email is required.' });
    if (!nid) errors.push({ field: 'nid', message: 'NID is required.' });
    if (!date_of_birth) errors.push({ field: 'date_of_birth', message: 'Date of birth is required.' });
    if (!phone) errors.push({ field: 'phone', message: 'Phone is required.' });
    if (!organizationName) errors.push({ field: 'organizationName', message: 'Organization name is required.' });

    if (errors.length > 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'One or more fields failed validation.', status: 400, details: errors }
      });
    }

    // Check for existing user
    const userExists = await client.query(
      'SELECT email, nid FROM users WHERE email = $1 OR nid = $2',
      [email, nid]
    );
    if (userExists.rows.length > 0) {
      const conflictField = userExists.rows[0].email === email ? 'Email' : 'NID';
      return res.status(409).json({
        error: { code: 'CONFLICT', message: `${conflictField} already taken.`, status: 409 }
      });
    }

    await client.query('BEGIN');

    // 1. Create user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userResult = await client.query(
      `INSERT INTO users (full_name, email, nid, date_of_birth, password_hash, phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
       RETURNING user_id`,
      [name || null, email, nid, date_of_birth, hashedPassword, phone]
    );
    const userId = userResult.rows[0].user_id;

    // 2. Create organization
    const joinCode = crypto.randomUUID().split('-')[0].toUpperCase();
    const orgResult = await client.query(
      `INSERT INTO organizations (primary_contact, organization_name, organization_type, unique_join_code)
       VALUES ($1, $2, 'Buyer', $3)
       RETURNING organization_id`,
      [userId, organizationName, joinCode]
    );
    const organizationId = orgResult.rows[0].organization_id;

    // 3. Create org employee (Owner)
    await client.query(
      `INSERT INTO organization_employees (organization_id, user_id, role_in_org)
       VALUES ($1, $2, 'Owner')`,
      [organizationId, userId]
    );

    // 4. Create user verification record
    const nidFrontPath = req.files?.nidFront?.[0]?.path || null;
    const nidBackPath = req.files?.nidBack?.[0]?.path || null;

    await client.query(
      `INSERT INTO user_verification (user_id, nid_front_file_path, nid_back_file_path)
       VALUES ($1, $2, $3)`,
      [userId, nidFrontPath, nidBackPath]
    );

    // 5. Save organization documents (trade license, TIN, VAT)
    const docMappings = [
      { field: 'tradeLicense', typeName: 'TradeLicense' },
      { field: 'tinCertificate', typeName: 'TIN' },
      { field: 'vatCertificate', typeName: 'VAT' },
    ];

    for (const mapping of docMappings) {
      const file = req.files?.[mapping.field]?.[0];
      if (file) {
        const typeResult = await client.query(
          'SELECT type_id FROM document_types WHERE type_name = $1',
          [mapping.typeName]
        );
        if (typeResult.rows.length > 0) {
          await client.query(
            `INSERT INTO organization_documents (organization_id, document_type_id, file_path)
             VALUES ($1, $2, $3)`,
            [organizationId, typeResult.rows[0].type_id, file.path]
          );
        }
      }
    }

    // 6. Generate tokens
    const { accessToken, refreshToken } = generateTokens(userId);
    await client.query('UPDATE users SET refresh_token = $1 WHERE user_id = $2', [refreshToken, userId]);

    await client.query('COMMIT');

    const userContext = await fetchUserContext(userId);

    return res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
      user: userContext,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// ─── Register User (via invitation token) ───────────────────
export const registerUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { email, nid, date_of_birth, password, phone, name, token } = req.body;

    // Validation
    const errors = [];
    if (!token) errors.push({ field: 'token', message: 'Invitation token is required.' });
    if (!password || password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
    }
    if (!email) errors.push({ field: 'email', message: 'Email is required.' });
    if (!nid) errors.push({ field: 'nid', message: 'NID is required.' });
    if (!date_of_birth) errors.push({ field: 'date_of_birth', message: 'Date of birth is required.' });
    if (!phone) errors.push({ field: 'phone', message: 'Phone is required.' });

    if (errors.length > 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'One or more fields failed validation.', status: 400, details: errors }
      });
    }

    // Validate invitation token
    const invResult = await pool.query(
      `SELECT * FROM user_invitations
       WHERE token = $1 AND status = 'Pending' AND expires_at > NOW()`,
      [token]
    );

    if (invResult.rows.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_INVITATION', message: 'Invitation token is invalid, expired, or already used.', status: 400 }
      });
    }

    const invitation = invResult.rows[0];

    // Check email matches invitation
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({
        error: { code: 'EMAIL_MISMATCH', message: 'Email does not match the invitation.', status: 400 }
      });
    }

    // Check for existing user
    const userExists = await pool.query(
      'SELECT email, nid FROM users WHERE email = $1 OR nid = $2',
      [email, nid]
    );
    if (userExists.rows.length > 0) {
      const conflictField = userExists.rows[0].email === email ? 'Email' : 'NID';
      return res.status(409).json({
        error: { code: 'CONFLICT', message: `${conflictField} already taken.`, status: 409 }
      });
    }

    await client.query('BEGIN');

    // 1. Create user (Active immediately since they're invited)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userResult = await client.query(
      `INSERT INTO users (full_name, email, nid, date_of_birth, password_hash, phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Active')
       RETURNING user_id`,
      [name || null, email, nid, date_of_birth, hashedPassword, phone]
    );
    const userId = userResult.rows[0].user_id;

    // 2. Create org employee (Viewer by default — master can change role later)
    await client.query(
      `INSERT INTO organization_employees (organization_id, user_id, role_in_org)
       VALUES ($1, $2, 'Viewer')`,
      [invitation.organization_id, userId]
    );

    // 3. Create user verification record
    const nidFrontPath = req.files?.nidFront?.[0]?.path || null;
    const nidBackPath = req.files?.nidBack?.[0]?.path || null;

    await client.query(
      `INSERT INTO user_verification (user_id, nid_front_file_path, nid_back_file_path)
       VALUES ($1, $2, $3)`,
      [userId, nidFrontPath, nidBackPath]
    );

    // 4. Mark invitation as accepted
    await client.query(
      `UPDATE user_invitations SET status = 'Accepted' WHERE invitation_id = $1`,
      [invitation.invitation_id]
    );

    // 5. Generate tokens
    const { accessToken, refreshToken } = generateTokens(userId);
    await client.query('UPDATE users SET refresh_token = $1 WHERE user_id = $2', [refreshToken, userId]);

    await client.query('COMMIT');

    const userContext = await fetchUserContext(userId);

    return res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
      user: userContext,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// ─── Login ──────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.', status: 401 }
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.', status: 401 }
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.user_id);
    await pool.query('UPDATE users SET refresh_token = $1, last_login_at = NOW() WHERE user_id = $2', [refreshToken, user.user_id]);

    const userContext = await fetchUserContext(user.user_id);

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
      user: userContext,
    });

  } catch (error) {
    next(error);
  }
};

// ─── Logout ─────────────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await pool.query('UPDATE users SET refresh_token = NULL WHERE user_id = $1', [userId]);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// ─── Refresh Token ──────────────────────────────────────────
export const refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token.', status: 401 }
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refresh_token, env.jwtRefreshSecret);
    } catch (err) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token.', status: 401 }
      });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE user_id = $1 AND refresh_token = $2',
      [decoded.id, refresh_token]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token.', status: 401 }
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.user_id);
    await pool.query('UPDATE users SET refresh_token = $1 WHERE user_id = $2', [refreshToken, user.user_id]);

    const userContext = await fetchUserContext(user.user_id);

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
      user: userContext,
    });

  } catch (error) {
    next(error);
  }
};

// ─── Get Current User ───────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const userContext = await fetchUserContext(req.user.id);
    return res.status(200).json({ user: userContext });
  } catch (error) {
    next(error);
  }
};