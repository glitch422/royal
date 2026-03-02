#!/usr/bin/env python3
"""Apply gateway migration SQL to Supabase Postgres.

This prompts for:
- project ref
- postgres password

Then runs db/migrations/002_gateway.sql
"""

from getpass import getpass
from urllib.parse import quote
import os
import sys

import psycopg2


def main():
    project_ref = input('Supabase project ref (e.g. zhytxkoasibzzpznvszx): ').strip()
    if not project_ref:
        print('Missing project ref')
        sys.exit(1)

    db_password = getpass('Postgres password (hidden): ').strip()
    if not db_password:
        print('Missing DB password')
        sys.exit(1)

    encoded_pw = quote(db_password, safe='')
    dsn = f"postgresql://postgres:{encoded_pw}@db.{project_ref}.supabase.co:5432/postgres?sslmode=require"

    sql_path = os.path.join(os.path.dirname(__file__), '..', 'db', 'migrations', '002_gateway.sql')
    sql_path = os.path.abspath(sql_path)

    with open(sql_path, 'r', encoding='utf-8') as f:
        sql = f.read()

    print(f'Applying migration: {sql_path}')

    conn = psycopg2.connect(dsn)
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        print('✅ Gateway migration applied successfully.')
    except Exception as e:
        conn.rollback()
        print('❌ Failed. Rolled back.')
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
