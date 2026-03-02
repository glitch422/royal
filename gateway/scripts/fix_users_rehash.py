#!/usr/bin/env python3
from getpass import getpass
from urllib.parse import quote
import os
import re
import sys
import bcrypt
import psycopg2
from dotenv import load_dotenv

# =========================
# CONFIG (EDIT HERE)
# =========================
PASSWORD_PEPPER = "royal_pepper_v1_7f3c9a2d"
HASH_SALT_ROUNDS = 12

USERS = [
    {
        "role": "root",
        "username": "Hero1_ghost",
        "email": "hack.glitch422+root@gmail.com",
        "password": "1WzY3T3LV-256b!yt",
    },
    {
        "role": "admin",
        "username": "Hero2_ghost",
        "email": "hack.glitch422+admin@gmail.com",
        "password": "1Wz3Y3TLV-256b!yt",
    },
    {
        "role": "player",
        "username": "Hero17",
        "email": "hack.glitch422+player@gmail.com",
        "password": "1WzY3TL3V-256b!yt",
    },
]
# =========================
# END CONFIG
# =========================


def extract_project_ref(supabase_url: str) -> str:
    m = re.match(r"^https://([a-z0-9]+)\.supabase\.co/?$", supabase_url.strip())
    if not m:
        raise ValueError("SUPABASE_URL must look like: https://<ref>.supabase.co")
    return m.group(1)


def bcrypt_hash(password: str, pepper: str, rounds: int) -> str:
    raw = (password + pepper).encode("utf-8")
    if len(raw) > 72:
        raise ValueError(
            f"bcrypt limit hit: len(password+pepper)={len(raw)} bytes > 72. "
            "Use a shorter password or shorter pepper."
        )
    salt = bcrypt.gensalt(rounds=rounds)
    return bcrypt.hashpw(raw, salt).decode("utf-8")


def main():
    # Load Backend .env
    load_dotenv()

    supabase_url = (os.getenv("SUPABASE_URL") or "").strip()
    if not supabase_url:
        print("Missing SUPABASE_URL in .env")
        sys.exit(1)

    env_pepper = os.getenv("PASSWORD_PEPPER")
    env_rounds = os.getenv("HASH_SALT_ROUNDS")

    print("\n=== Fix users password_hash (rehash) ===")
    print("SUPABASE_URL:", supabase_url)
    print("ENV PEPPER LEN:", len(env_pepper or ""))
    print("ENV HASH_SALT_ROUNDS:", env_rounds or "(not set)")
    print("SCRIPT PEPPER LEN:", len(PASSWORD_PEPPER))
    print("SCRIPT HASH_SALT_ROUNDS:", HASH_SALT_ROUNDS)

    # Strong safety: ensure script pepper matches env pepper
    if (env_pepper or "") != PASSWORD_PEPPER:
        raise RuntimeError(
            "Mismatch: PASSWORD_PEPPER in .env is different from PASSWORD_PEPPER in this script.\n"
            "Fix it so they are EXACTLY the same, then run again."
        )

    project_ref = extract_project_ref(supabase_url)
    db_password = getpass("Postgres password (hidden): ").strip()
    if not db_password:
        raise RuntimeError("Missing Postgres password")

    encoded_pw = quote(db_password, safe="")
    dsn = f"postgresql://postgres:{encoded_pw}@db.{project_ref}.supabase.co:5432/postgres?sslmode=require"

    conn = psycopg2.connect(dsn)
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            for u in USERS:
                role = u["role"]
                username = u["username"]
                email = u["email"]
                password = u["password"]

                print(f"\n--- {role.upper()} ---")
                print("username:", username)
                print("email   :", email)

                # Ensure user exists
                cur.execute("SELECT id, role, email FROM public.users WHERE username=%s LIMIT 1;", (username,))
                row = cur.fetchone()
                if not row:
                    raise RuntimeError(f"User not found by username: {username}")
                user_id, current_role, current_email = row

                # Rehash with pepper
                new_hash = bcrypt_hash(password, PASSWORD_PEPPER, HASH_SALT_ROUNDS)

                cur.execute(
                    "UPDATE public.users SET password_hash=%s, updated_at=now() WHERE username=%s;",
                    (new_hash, username),
                )
                print("Updated password_hash OK for:", username, "id=", user_id)

        conn.commit()
        print("\n✅ Done. All 3 users rehashed with the pepper.\n")
        print("Now restart your backend and login will work.\n")

    except Exception:
        conn.rollback()
        print("\n❌ Failed. Rolled back.\n")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
