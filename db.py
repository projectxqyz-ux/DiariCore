"""
DiariCore database layer — same pattern as AnemoCheck: PostgreSQL on Railway
(via DATABASE_URL) or SQLite locally.
"""

import os
import sqlite3
from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash

USE_POSTGRES = bool(os.environ.get("DATABASE_URL"))
SQLITE_PATH = os.environ.get("DATABASE_PATH", "diaricore.db")


def _connect_postgres():
    import psycopg2
    from psycopg2.extras import RealDictCursor

    url = os.environ["DATABASE_URL"]
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return psycopg2.connect(url, cursor_factory=RealDictCursor)


def _connect_sqlite():
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_conn():
    if USE_POSTGRES:
        return _connect_postgres()
    return _connect_sqlite()


def row_to_dict(row):
    if row is None:
        return None
    if isinstance(row, dict):
        return row
    return dict(row)


def init_db():
    conn = get_conn()
    cur = conn.cursor()
    try:
        if USE_POSTGRES:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    nickname VARCHAR(64) NOT NULL UNIQUE,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password_hash VARCHAR(256) NOT NULL,
                    first_name VARCHAR(64),
                    last_name VARCHAR(64),
                    gender VARCHAR(32),
                    birthday DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS pending_registrations (
                    email VARCHAR(255) PRIMARY KEY,
                    nickname VARCHAR(64) NOT NULL,
                    password_hash VARCHAR(256) NOT NULL,
                    first_name VARCHAR(64),
                    last_name VARCHAR(64),
                    gender VARCHAR(32),
                    birthday DATE,
                    otp_code VARCHAR(6) NOT NULL,
                    otp_expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
        else:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nickname TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    first_name TEXT,
                    last_name TEXT,
                    gender TEXT,
                    birthday TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS pending_registrations (
                    email TEXT PRIMARY KEY,
                    nickname TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    first_name TEXT,
                    last_name TEXT,
                    gender TEXT,
                    birthday TEXT,
                    otp_code TEXT NOT NULL,
                    otp_expires_at TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
        if USE_POSTGRES:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS system_settings (
                    key VARCHAR(128) PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
        else:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS system_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
        conn.commit()
    finally:
        conn.close()


def get_user_by_email(email: str):
    conn = get_conn()
    cur = conn.cursor()
    try:
        if USE_POSTGRES:
            cur.execute(
                "SELECT id, nickname, email, password_hash, first_name, last_name, gender, birthday, created_at FROM users WHERE email = %s",
                (email.lower().strip(),),
            )
        else:
            cur.execute(
                "SELECT id, nickname, email, password_hash, first_name, last_name, gender, birthday, created_at FROM users WHERE lower(email) = ?",
                (email.lower().strip(),),
            )
        return row_to_dict(cur.fetchone())
    finally:
        conn.close()


def get_user_by_nickname(nickname: str):
    conn = get_conn()
    cur = conn.cursor()
    try:
        if USE_POSTGRES:
            cur.execute(
                "SELECT id, nickname, email, password_hash, first_name, last_name, gender, birthday, created_at FROM users WHERE lower(nickname) = %s",
                (nickname.lower().strip(),),
            )
        else:
            cur.execute(
                "SELECT id, nickname, email, password_hash, first_name, last_name, gender, birthday, created_at FROM users WHERE lower(nickname) = ?",
                (nickname.lower().strip(),),
            )
        return row_to_dict(cur.fetchone())
    finally:
        conn.close()


def create_user(
    nickname: str,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    gender: str,
    birthday: str,
):
    """Returns (True, user_dict) or (False, field_id, error_message)."""
    password_hash = generate_password_hash(password)
    email_norm = email.lower().strip()
    nickname_norm = nickname.strip()

    conn = get_conn()
    cur = conn.cursor()
    try:
        if USE_POSTGRES:
            cur.execute(
                """
                INSERT INTO users (nickname, email, password_hash, first_name, last_name, gender, birthday)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, nickname, email, first_name, last_name, gender, birthday, created_at
                """,
                (nickname_norm, email_norm, password_hash, first_name.strip(), last_name.strip(), gender, birthday),
            )
            row = cur.fetchone()
            conn.commit()
            u = row_to_dict(row)
            u.pop("password_hash", None)
            return True, u
        else:
            cur.execute(
                """
                INSERT INTO users (nickname, email, password_hash, first_name, last_name, gender, birthday)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    nickname_norm,
                    email_norm,
                    password_hash,
                    first_name.strip(),
                    last_name.strip(),
                    gender,
                    birthday,
                ),
            )
            uid = cur.lastrowid
            conn.commit()
            cur.execute(
                "SELECT id, nickname, email, first_name, last_name, gender, birthday, created_at FROM users WHERE id = ?",
                (uid,),
            )
            u = row_to_dict(cur.fetchone())
            return True, u
    except Exception as e:
        conn.rollback()
        err = str(e).lower()
        if any(s in err for s in ("unique", "duplicate", "already exists")):
            if "nickname" in err:
                return False, "nickname", "Nickname already exists."
            if "email" in err:
                return False, "signUpEmail", "Email already exists."
        return False, None, "Could not create account. Please try again."
    finally:
        conn.close()


def store_pending_registration(
    *,
    nickname: str,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    gender: str,
    birthday: str,
    otp_code: str,
    otp_expires_at,
):
    email_norm = email.lower().strip()
    nickname_norm = nickname.strip()
    password_hash = generate_password_hash(password)

    conn = get_conn()
    cur = conn.cursor()
    try:
        if USE_POSTGRES:
            cur.execute(
                """
                INSERT INTO pending_registrations
                (email, nickname, password_hash, first_name, last_name, gender, birthday, otp_code, otp_expires_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (email) DO UPDATE SET
                    nickname = EXCLUDED.nickname,
                    password_hash = EXCLUDED.password_hash,
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    gender = EXCLUDED.gender,
                    birthday = EXCLUDED.birthday,
                    otp_code = EXCLUDED.otp_code,
                    otp_expires_at = EXCLUDED.otp_expires_at,
                    created_at = CURRENT_TIMESTAMP
                """,
                (email_norm, nickname_norm, password_hash, first_name.strip(), last_name.strip(), gender, birthday, otp_code, otp_expires_at),
            )
        else:
            cur.execute(
                """
                INSERT INTO pending_registrations
                (email, nickname, password_hash, first_name, last_name, gender, birthday, otp_code, otp_expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(email) DO UPDATE SET
                    nickname = excluded.nickname,
                    password_hash = excluded.password_hash,
                    first_name = excluded.first_name,
                    last_name = excluded.last_name,
                    gender = excluded.gender,
                    birthday = excluded.birthday,
                    otp_code = excluded.otp_code,
                    otp_expires_at = excluded.otp_expires_at,
                    created_at = CURRENT_TIMESTAMP
                """,
                (
                    email_norm,
                    nickname_norm,
                    password_hash,
                    first_name.strip(),
                    last_name.strip(),
                    gender,
                    birthday,
                    otp_code,
                    str(otp_expires_at),
                ),
            )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False
    finally:
        conn.close()


def get_pending_registration(email: str):
    email_norm = email.lower().strip()
    conn = get_conn()
    cur = conn.cursor()
    try:
        if USE_POSTGRES:
            cur.execute("SELECT * FROM pending_registrations WHERE email = %s", (email_norm,))
        else:
            cur.execute("SELECT * FROM pending_registrations WHERE lower(email) = ?", (email_norm,))
        return row_to_dict(cur.fetchone())
    finally:
        conn.close()


def update_pending_otp(email: str, otp_code: str, otp_expires_at):
    email_norm = email.lower().strip()
    conn = get_conn()
    cur = conn.cursor()
    try:
        if USE_POSTGRES:
            cur.execute(
                "UPDATE pending_registrations SET otp_code = %s, otp_expires_at = %s WHERE email = %s",
                (otp_code, otp_expires_at, email_norm),
            )
        else:
            cur.execute(
                "UPDATE pending_registrations SET otp_code = ?, otp_expires_at = ? WHERE lower(email) = ?",
                (otp_code, str(otp_expires_at), email_norm),
            )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_pending_registration(email: str):
    email_norm = email.lower().strip()
    conn = get_conn()
    cur = conn.cursor()
    try:
        if USE_POSTGRES:
            cur.execute("DELETE FROM pending_registrations WHERE email = %s", (email_norm,))
        else:
            cur.execute("DELETE FROM pending_registrations WHERE lower(email) = ?", (email_norm,))
        conn.commit()
    finally:
        conn.close()


def create_user_from_pending(pending: dict):
    conn = get_conn()
    cur = conn.cursor()
    try:
        if USE_POSTGRES:
            cur.execute(
                """
                INSERT INTO users (nickname, email, password_hash, first_name, last_name, gender, birthday)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, nickname, email, first_name, last_name, gender, birthday, created_at
                """,
                (
                    (pending.get("nickname") or "").strip(),
                    (pending.get("email") or "").lower().strip(),
                    pending.get("password_hash"),
                    (pending.get("first_name") or "").strip(),
                    (pending.get("last_name") or "").strip(),
                    pending.get("gender"),
                    pending.get("birthday"),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return True, row_to_dict(row)
        cur.execute(
            """
            INSERT INTO users (nickname, email, password_hash, first_name, last_name, gender, birthday)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                (pending.get("nickname") or "").strip(),
                (pending.get("email") or "").lower().strip(),
                pending.get("password_hash"),
                (pending.get("first_name") or "").strip(),
                (pending.get("last_name") or "").strip(),
                pending.get("gender"),
                pending.get("birthday"),
            ),
        )
        uid = cur.lastrowid
        conn.commit()
        cur.execute(
            "SELECT id, nickname, email, first_name, last_name, gender, birthday, created_at FROM users WHERE id = ?",
            (uid,),
        )
        return True, row_to_dict(cur.fetchone())
    except Exception as e:
        conn.rollback()
        err = str(e).lower()
        if "nickname" in err:
            return False, ("nickname", "Nickname already exists.")
        if "email" in err:
            return False, ("signUpEmail", "Email already exists.")
        return False, (None, "Could not create account. Please try again.")
    finally:
        conn.close()


def get_system_setting(key: str, default=None):
    conn = get_conn()
    cur = conn.cursor()
    try:
        if USE_POSTGRES:
            cur.execute("SELECT value FROM system_settings WHERE key = %s", (key,))
        else:
            cur.execute("SELECT value FROM system_settings WHERE key = ?", (key,))
        row = cur.fetchone()
        if not row:
            return default
        if isinstance(row, dict):
            return row.get("value", default)
        return row[0] if row[0] is not None else default
    finally:
        conn.close()


def set_system_setting(key: str, value: str):
    conn = get_conn()
    cur = conn.cursor()
    try:
        if USE_POSTGRES:
            cur.execute(
                """
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (key, value),
            )
        else:
            cur.execute(
                """
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (key, value),
            )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False
    finally:
        conn.close()


def verify_login(email: str, password: str):
    """Returns (True, user_dict) or (False, error_message)."""
    user = get_user_by_email(email)
    if not user:
        return False, "Invalid email or password."
    if not check_password_hash(user["password_hash"], password):
        return False, "Invalid email or password."
    out = {k: v for k, v in user.items() if k != "password_hash"}
    return True, out
