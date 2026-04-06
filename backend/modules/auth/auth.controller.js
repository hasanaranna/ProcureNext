import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/db.js';
import { env } from '../../config/env.js';

export const register = async (req, res, next) => {
  try {
    const { email, nid, date_of_birth, password, phone } = req.body;

    const errors = [];
    if (!password || password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
    }
    if (!email || !nid || !date_of_birth || !phone) {
      errors.push({ field: 'general', message: 'Email, NID, date of birth, and phone are required.' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'One or more fields failed validation.',
          status: 400,
          details: errors
        }
      });
    }

    const userExists = await pool.query(
      'SELECT email, nid FROM users WHERE email = $1 OR nid = $2',
      [email, nid]
    );

    if (userExists.rows.length > 0) {
      const conflictField = userExists.rows[0].email === email ? 'Email' : 'NID';
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: `${conflictField} already taken.`,
          status: 409
        }
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (email, nid, date_of_birth, password_hash, phone) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, email, nid, date_of_birth, phone, created_at',
      [email, nid, date_of_birth, hashedPassword, phone]
    );

    const user = newUser.rows[0];

    const accessToken = jwt.sign({ id: user.user_id }, env.jwtAccessSecret, { expiresIn: 3600 });
    const refreshToken = jwt.sign({ id: user.user_id }, env.jwtRefreshSecret, { expiresIn: '7d' });

    await pool.query('UPDATE users SET refresh_token = $1 WHERE user_id = $2', [refreshToken, user.user_id]);

    return res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
      user: {
        id: user.user_id,
        email: user.email,
        nid: user.nid,
        date_of_birth: new Date(user.date_of_birth).toISOString().split('T')[0],
        phone: user.phone,
        created_at: user.created_at
      }
    });

  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password.',
          status: 401
        }
      });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password.',
          status: 401
        }
      });
    }
    
    const accessToken = jwt.sign({ id: user.user_id }, env.jwtAccessSecret, { expiresIn: 3600 });
    const refreshToken = jwt.sign({ id: user.user_id }, env.jwtRefreshSecret, { expiresIn: '7d' });

    await pool.query('UPDATE users SET refresh_token = $1 WHERE user_id = $2', [refreshToken, user.user_id]);

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
      user: {
        id: user.user_id,
        email: user.email,
        nid: user.nid,
        date_of_birth: new Date(user.date_of_birth).toISOString().split('T')[0],
        phone: user.phone,
        created_at: user.created_at
      }
    });

  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await pool.query(
      'UPDATE users SET refresh_token = NULL WHERE user_id = $1',
      [userId]
    );
    return res.status(204).send();

  } catch (error) {
    next(error);
  }
};

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
      // eslint-disable-next-line no-unused-vars
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

    const newAccessToken = jwt.sign({ id: user.user_id }, env.jwtAccessSecret, { expiresIn: 3600 });
    const newRefreshToken = jwt.sign({ id: user.user_id }, env.jwtRefreshSecret, { expiresIn: '7d' });

    await pool.query(
      'UPDATE users SET refresh_token = $1 WHERE user_id = $2',
      [newRefreshToken, user.user_id]
    );

    return res.status(200).json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
      user: {
        id: user.user_id,
        email: user.email,
        nid: user.nid,
        date_of_birth: new Date(user.date_of_birth).toISOString().split('T')[0],
        phone: user.phone,
        created_at: user.created_at
      }
    });

  } catch (error) {
    next(error);
  }
};