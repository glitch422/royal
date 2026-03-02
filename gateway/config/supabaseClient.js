/**
 * ==========================================
 * ROYAL CASINO - SUPABASE CLIENT (BACKEND)
 * ==========================================
 * This file establishes a secure connection to the Supabase database
 * using the Service Role Key. This bypasses RLS (Row Level Security), 
 * giving the backend absolute administrative privileges (Root access).
 */

// Load env for non-server entry points (workers/scripts) too.
// Prefer DOTENV_PATH if provided.
const path = require('path');
const dotenv = require('dotenv');

const dotenvPath = process.env.DOTENV_PATH
  ? path.resolve(process.env.DOTENV_PATH)
  : path.resolve(process.cwd(), '.env');

dotenv.config({ path: dotenvPath, override: false });
const { createClient } = require('@supabase/supabase-js');

// 1. Fetch Environment Variables safely
// Make sure these exact names exist in your backend .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 2. Validate configuration before starting the server
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('🚨 CRITICAL ERROR: Supabase configuration missing in .env');
    console.error(`- URL exists: ${!!supabaseUrl}`);
    console.error(`- Service Key exists: ${!!supabaseServiceKey}`);
    console.error(`- DOTENV_PATH: ${process.env.DOTENV_PATH || '(not set)'} (loaded from ${dotenvPath})`);
    process.exit(1); // Kill the server immediately - it cannot function without the DB
}

// 3. Initialize the Supabase Client
// We use specific auth settings tailored for a Node.js backend environment
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false, // Backend doesn't need to refresh UI sessions
        persistSession: false,   // Backend doesn't persist sessions in local storage
    }
});

console.log('✅ Supabase Client initialized successfully with SERVICE ROLE access.');

module.exports = supabase;
