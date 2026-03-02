require('dotenv').config(); // reads .env

const { createClient } = require('@supabase/supabase-js');

// Use bcryptjs if bcrypt native fails to install
let bcrypt;
try { bcrypt = require('bcrypt'); }
catch { bcrypt = require('bcryptjs'); }

function must(k) {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
}

// Supabase connection (from .env)
const SUPABASE_URL = must('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = must('SUPABASE_SERVICE_ROLE_KEY');

// Pepper config (from .env)
const PEPPER = process.env.PASSWORD_PEPPER || '';
const ROUNDS = parseInt(process.env.HASH_SALT_ROUNDS || '12', 10);

// === EDIT THESE USERS (you asked to set them manually in code) ===
const USERS = [
  {
    role: 'root',
    username: 'Hero1_ghost',
    email: 'hack.glitch422+root@gmail.com',
    password: '1WzY3T3LV-256b!yt',
  },
  {
    role: 'admin',
    username: 'Hero2_ghost',
    email: 'hack.glitch422+admin@gmail.com',
    password: '1Wz3Y3TLV-256b!yt',
  },
  {
    role: 'player',
    username: 'Hero17',
    email: 'hack.glitch422+player@gmail.com',
    password: '1WzY3TL3V-256b!yt',
  },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function hashPassword(pw) {
  const raw = pw + PEPPER;
  const len = Buffer.byteLength(raw, 'utf8');
  if (len > 72) {
    throw new Error(`bcrypt limit: password+pepper is ${len} bytes (>72). Shorten password or pepper.`);
  }
  return await bcrypt.hash(raw, ROUNDS);
}

async function main() {
  console.log('PEPPER_LEN =', (PEPPER || '').length);
  console.log('ROUNDS =', ROUNDS);

  for (const u of USERS) {
    // Verify user exists
    const { data: existing, error: findErr } = await supabase
      .from('users')
      .select('id, username, email, role')
      .eq('username', u.username)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!existing) throw new Error(`User not found in DB by username: ${u.username}`);

    const newHash = await hashPassword(u.password);

    const { data: updated, error: upErr } = await supabase
      .from('users')
      .update({ password_hash: newHash, updated_at: new Date().toISOString() })
      .eq('username', u.username)
      .select('id, username, email, role')
      .single();

    if (upErr) throw upErr;

    console.log(`✅ updated ${u.role}: ${updated.username} / ${updated.email} (id=${updated.id})`);
  }

  console.log('\nDONE. Restart backend and login should work.');
}

main().catch((e) => {
  console.error('❌ FAILED:', e.message || e);
  process.exit(1);
});
