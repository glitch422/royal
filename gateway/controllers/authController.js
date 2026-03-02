/**
 * ==========================================
 * ROYAL CASINO - AUTH CONTROLLER
 * ==========================================
 * Handles user registration and login logic.
 * Integrates with Supabase for data storage and 
 * utilizes JWT/HttpOnly Cookies for secure sessions.
 */

// Use bcryptjs to avoid native build issues (node-gyp) on some environments.
// bcryptjs is compatible with existing bcrypt hashes.
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabaseClient');
const { sendTokenResponse } = require('../utils/jwtSecurity');
const logger = require('../utils/logger');

// Pepper adds an extra layer of security against Rainbow Table attacks
const PEPPER = process.env.PASSWORD_PEPPER || '';

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
const register = async (req, res, next) => {
    try {
        // 1. Extract data (Already validated by Joi & password decrypted by RSA middleware)
        const { username, email, password } = req.body;

        // 2. Check if user already exists in Supabase
        const { data: existingUser, error: searchError } = await supabase
            .from('users')
            .select('id')
            .or(`email.eq.${email},username.eq.${username}`)
            .maybeSingle();

        if (searchError) {
            logger.error(`Supabase search error during registration: ${searchError.message}`);
            throw new Error('Database error during user validation');
        }

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Username or Email is already in use.'
            });
        }

        // 3. Hash the password securely (Bcrypt + Salt + Pepper)
        const saltRounds = parseInt(process.env.HASH_SALT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(password + PEPPER, saltRounds);

        // 4. Insert new user into Database
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
                username: username,
                email: email,
                password_hash: hashedPassword,
                role: 'player', // Default role for new signups
                balance: 0,     // Default casino balance
                created_at: new Date().toISOString()
            }])
            .select('id, username, email, role, balance') // Deliberately excluding password_hash
            .single();

        if (insertError) {
            logger.error(`Supabase insert error during registration: ${insertError.message}`);
            throw new Error('Failed to create user account');
        }

        logger.info(`[${req.ip}] New user registered successfully: ${username}`);

        // 5. Generate JWT and send inside HttpOnly Cookie
        sendTokenResponse(newUser, 201, res, 'Registration successful. Welcome to Royal Casino!');

    } catch (error) {
        // Pass any unexpected errors to the global error handler
        next(error);
    }
};

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
const login = async (req, res, next) => {
    try {
        // 1. Extract data (Assumes Joi validation & RSA decryption applied on the route)
        const { email, password } = req.body;

        // 2. Find user in Database
        const { data: user, error: searchError } = await supabase
            .from('users')
            .select('id, username, email, password_hash, role, balance')
            .eq('email', email)
            .maybeSingle();

        if (searchError) {
            logger.error(`Supabase search error during login: ${searchError.message}`);
            throw new Error('Database error during authentication');
        }

        // 3. Verify user exists
        if (!user) {
            logger.warn(`[${req.ip}] Failed login attempt for non-existent email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // 4. Compare passwords using Bcrypt
        const isMatch = await bcrypt.compare(password + PEPPER, user.password_hash);
        
        if (!isMatch) {
            logger.warn(`[${req.ip}] Failed login attempt (wrong password) for: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        logger.info(`[${req.ip}] User logged in successfully: ${user.username}`);

        // 5. Clean up sensitive data before sending to client
        user.password_hash = undefined;

        // 6. Generate JWT and send inside HttpOnly Cookie
        sendTokenResponse(user, 200, res, 'Login successful');

    } catch (error) {
        next(error);
    }
};

module.exports = { register, login };
