#!/usr/bin/env python3
"""
Apply the System Health migration to Supabase Postgres.

Usage:
  python3 scripts/apply_system_heartbeat_migration.py

It will prompt for:
  - Supabase project ref (e.g. zhytxkoasibzzpznvszx)
  - Postgres password (the Supabase DB password)
"""
from getpass import getpass
from urllib.parse import quote
import os

try:
    import psycopg2
except Exception:
    print("Missing psycopg2. Install inside a venv: python3 -m venv .venv && source .venv/bin/activate && pip install psycopg2-binary")
    raise

def main():
    print("\n=== Apply System Health Migration ===\n")
    project_ref = input("Supabase project ref (e.g. zhytxkoasibzzpznvszx): ").strip()
    if not project_ref:
        raise SystemExit("Missing project ref")

    db_password = getpass("Postgres password (hidden): ").strip()
    if not db_password:
        raise SystemExit("Missing DB password")

    encoded_pw = quote(db_password, safe="")
    dsn = f"postgresql://postgres:{encoded_pw}@db.{project_ref}.supabase.co:5432/postgres?sslmode=require"

    migration_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "db", "migrations", "003_system_heartbeat.sql"))
    if not os.path.exists(migration_path):
        raise SystemExit(f"Migration file not found: {migration_path}")

    with open(migration_path, "r", encoding="utf-8") as f:
        sql = f.read()

    print(f"Applying migration: {migration_path}")
    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        print("✅ System health migration applied successfully.")
    except Exception:
        conn.rollback()
        print("❌ Failed. Rolled back.")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()
