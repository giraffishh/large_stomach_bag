#!/usr/bin/env python3
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("CANDIDATE_DB_PATH", BASE_DIR / "data" / "candidates.sqlite"))
BACKUP_DIR = Path(os.environ.get("CANDIDATE_BACKUP_DIR", BASE_DIR / "backups"))
BACKUP_RETENTION_DAYS = int(os.environ.get("BACKUP_RETENTION_DAYS", "30"))
HIDDEN_RETENTION_DAYS = int(os.environ.get("HIDDEN_RETENTION_DAYS", "30"))
AUDIT_LOG_RETENTION_DAYS = int(os.environ.get("AUDIT_LOG_RETENTION_DAYS", "7"))


def main():
    if not DB_PATH.exists():
        raise SystemExit(f"Database not found: {DB_PATH}")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    deleted_logs = cleanup_old_audit_logs()
    backup_path = BACKUP_DIR / f"candidates-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.sqlite"

    with sqlite3.connect(DB_PATH) as source:
        with sqlite3.connect(backup_path) as target:
            source.backup(target)

    deleted_candidates = cleanup_hidden_candidates()
    vacuum_database()
    deleted_backups = cleanup_old_backups()
    print(f"Backup created: {backup_path}")
    print(f"Hidden candidates deleted: {deleted_candidates}")
    print(f"Audit logs deleted: {deleted_logs}")
    print(f"Old backups deleted: {deleted_backups}")


def cleanup_hidden_candidates():
    cutoff = (datetime.now(timezone.utc) - timedelta(days=HIDDEN_RETENTION_DAYS)).isoformat(
        timespec="milliseconds"
    ).replace("+00:00", "Z")

    with sqlite3.connect(DB_PATH) as connection:
        hidden_ids = [
            row[0]
            for row in connection.execute(
                "SELECT id FROM candidates WHERE status = 'hidden' AND updated_at < ?",
                (cutoff,),
            ).fetchall()
        ]
        if hidden_ids:
            placeholders = ",".join("?" for _ in hidden_ids)
            connection.execute(
                f"DELETE FROM candidate_comments WHERE candidate_id IN ({placeholders})",
                hidden_ids,
            )
        cursor = connection.execute(
            "DELETE FROM candidates WHERE status = 'hidden' AND updated_at < ?",
            (cutoff,),
        )
        return cursor.rowcount


def cleanup_old_backups():
    cutoff = datetime.now(timezone.utc) - timedelta(days=BACKUP_RETENTION_DAYS)
    deleted = 0

    for backup_path in BACKUP_DIR.glob("candidates-*.sqlite"):
        modified_at = datetime.fromtimestamp(backup_path.stat().st_mtime, timezone.utc)
        if modified_at < cutoff:
            backup_path.unlink()
            deleted += 1

    return deleted


def cleanup_old_audit_logs():
    cutoff = (datetime.now(timezone.utc) - timedelta(days=AUDIT_LOG_RETENTION_DAYS)).isoformat(
        timespec="milliseconds"
    ).replace("+00:00", "Z")

    with sqlite3.connect(DB_PATH) as connection:
        cursor = connection.execute(
            "DELETE FROM candidate_audit_logs WHERE created_at < ?",
            (cutoff,),
        )
        return cursor.rowcount


def vacuum_database():
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute("VACUUM")


if __name__ == "__main__":
    main()
