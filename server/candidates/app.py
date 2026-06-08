#!/usr/bin/env python3
import json
import os
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = BASE_DIR / "data"
DB_PATH = Path(os.environ.get("CANDIDATE_DB_PATH", DEFAULT_DATA_DIR / "candidates.sqlite"))
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8080"))
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]
MAX_TAGS = 8
MAX_BODY_BYTES = int(os.environ.get("MAX_BODY_BYTES", "32768"))
MAX_LIST_ITEMS = int(os.environ.get("MAX_LIST_ITEMS", "500"))
MAX_COMMENT_ITEMS = int(os.environ.get("MAX_COMMENT_ITEMS", "200"))
MAX_AUDIT_PAYLOAD_LENGTH = 1200


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=8)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA foreign_keys=ON")
    return connection


def init_database():
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS candidates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                city TEXT NOT NULL DEFAULT '',
                address TEXT NOT NULL DEFAULT '',
                price INTEGER,
                tags TEXT NOT NULL DEFAULT '[]',
                reason TEXT NOT NULL DEFAULT '',
                submitter TEXT NOT NULL DEFAULT '',
                upvotes INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'open',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_candidates_visible_sort
            ON candidates(status, upvotes DESC, updated_at DESC)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS candidate_audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id TEXT NOT NULL DEFAULT '',
                action TEXT NOT NULL,
                ip TEXT NOT NULL DEFAULT '',
                user_agent TEXT NOT NULL DEFAULT '',
                payload TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_candidate_audit_logs_created_at
            ON candidate_audit_logs(created_at)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_candidate_audit_logs_candidate_id
            ON candidate_audit_logs(candidate_id)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS candidate_comments (
                id TEXT PRIMARY KEY,
                candidate_id TEXT NOT NULL,
                author TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL,
                ip TEXT NOT NULL DEFAULT '',
                user_agent TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'visible',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_candidate_comments_visible_sort
            ON candidate_comments(candidate_id, status, created_at DESC)
            """
        )


def candidate_from_row(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "city": row["city"],
        "address": row["address"],
        "price": row["price"],
        "tags": json.loads(row["tags"] or "[]"),
        "reason": row["reason"],
        "submitter": row["submitter"],
        "upvotes": row["upvotes"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def sanitize_candidate_input(payload):
    if not isinstance(payload, dict):
        payload = {}

    name = sanitize_string(payload.get("name"), 80)
    if not name:
        raise PublicError(HTTPStatus.BAD_REQUEST, "请填写店名。")

    reason = sanitize_string(payload.get("reason"), 500)
    if not reason:
        raise PublicError(HTTPStatus.BAD_REQUEST, "请填写推荐理由。")

    return {
        "name": name,
        "city": sanitize_string(payload.get("city"), 40),
        "address": sanitize_string(payload.get("address"), 160),
        "price": sanitize_price(payload.get("price")),
        "tags": sanitize_tags(payload.get("tags")),
        "reason": reason,
        "submitter": sanitize_string(payload.get("submitter"), 40),
    }


def sanitize_string(value, max_length):
    return str(value or "").strip()[:max_length]


def sanitize_price(value):
    if value in (None, ""):
        return None

    try:
        price = int(value)
    except (TypeError, ValueError):
        return None

    return max(price, 0)


def sanitize_tags(value):
    if not isinstance(value, list):
        return []

    tags = []
    seen = set()
    for raw_tag in value:
        tag = sanitize_string(raw_tag, 24)
        if tag and tag not in seen:
            tags.append(tag)
            seen.add(tag)
        if len(tags) >= MAX_TAGS:
            break
    return tags


def sanitize_comment_input(payload):
    if not isinstance(payload, dict):
        payload = {}

    content = sanitize_string(payload.get("content"), 500)
    if len(content) < 2:
        raise PublicError(HTTPStatus.BAD_REQUEST, "评论至少需要 2 个字。")

    return {
        "author": sanitize_string(payload.get("author"), 40),
        "content": content,
    }


def list_candidates():
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM candidates
            WHERE status != 'hidden'
            ORDER BY upvotes DESC, updated_at DESC
            LIMIT ?
            """,
            (MAX_LIST_ITEMS,),
        ).fetchall()
    return [candidate_from_row(row) for row in rows]


def comment_from_row(row):
    return {
        "id": row["id"],
        "candidateId": row["candidate_id"],
        "author": row["author"],
        "content": row["content"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def list_candidate_comments(candidate_id):
    with get_connection() as connection:
        ensure_candidate_exists(connection, candidate_id)
        rows = connection.execute(
            """
            SELECT *
            FROM candidate_comments
            WHERE candidate_id = ? AND status = 'visible'
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (candidate_id, MAX_COMMENT_ITEMS),
        ).fetchall()
    return [comment_from_row(row) for row in rows]


def create_candidate_comment(candidate_id, payload, context):
    comment = sanitize_comment_input(payload)
    timestamp = now_iso()
    comment_id = f"comment_{int(time.time() * 1000)}_{secrets.token_hex(4)}"

    with get_connection() as connection:
        ensure_candidate_exists(connection, candidate_id)
        connection.execute(
            """
            INSERT INTO candidate_comments (
                id, candidate_id, author, content, ip, user_agent,
                status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'visible', ?, ?)
            """,
            (
                comment_id,
                candidate_id,
                comment["author"],
                comment["content"],
                context["ip"],
                context["userAgent"],
                timestamp,
                timestamp,
            ),
        )
        row = connection.execute(
            "SELECT * FROM candidate_comments WHERE id = ?",
            (comment_id,),
        ).fetchone()
        write_audit_log(connection, "comment_create", candidate_id, context, comment)

    return comment_from_row(row)


def delete_candidate_comment(candidate_id, comment_id, context):
    timestamp = now_iso()

    with get_connection() as connection:
        ensure_candidate_exists(connection, candidate_id)
        row = connection.execute(
            """
            SELECT *
            FROM candidate_comments
            WHERE id = ? AND candidate_id = ? AND status = 'visible'
            """,
            (comment_id, candidate_id),
        ).fetchone()
        if row is None:
            raise PublicError(HTTPStatus.NOT_FOUND, "没有找到这条评论。")

        connection.execute(
            """
            UPDATE candidate_comments
            SET status = 'hidden', updated_at = ?
            WHERE id = ? AND candidate_id = ?
            """,
            (timestamp, comment_id, candidate_id),
        )
        write_audit_log(
            connection,
            "comment_delete",
            candidate_id,
            context,
            {
                "commentId": comment_id,
                "author": row["author"],
                "content": row["content"],
            },
        )

    return comment_from_row(row)


def create_candidate(payload, context):
    candidate = sanitize_candidate_input(payload)
    timestamp = now_iso()
    candidate_id = f"cand_{int(time.time() * 1000)}_{secrets.token_hex(4)}"

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO candidates (
                id, name, city, address, price, tags, reason, submitter,
                upvotes, status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'open', ?, ?)
            """,
            (
                candidate_id,
                candidate["name"],
                candidate["city"],
                candidate["address"],
                candidate["price"],
                json.dumps(candidate["tags"], ensure_ascii=False),
                candidate["reason"],
                candidate["submitter"],
                timestamp,
                timestamp,
            ),
        )
        row = connection.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,)).fetchone()
        write_audit_log(connection, "create", candidate_id, context, candidate)

    return candidate_from_row(row)


def update_candidate(candidate_id, payload, context):
    candidate = sanitize_candidate_input(payload)
    timestamp = now_iso()

    with get_connection() as connection:
        previous = ensure_candidate_exists(connection, candidate_id)
        connection.execute(
            """
            UPDATE candidates
            SET name = ?, city = ?, address = ?, price = ?, tags = ?,
                reason = ?, submitter = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                candidate["name"],
                candidate["city"],
                candidate["address"],
                candidate["price"],
                json.dumps(candidate["tags"], ensure_ascii=False),
                candidate["reason"],
                candidate["submitter"],
                timestamp,
                candidate_id,
            ),
        )
        row = connection.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,)).fetchone()
        write_audit_log(
            connection,
            "update",
            candidate_id,
            context,
            {
                "before": summarize_candidate(previous),
                "after": candidate,
            },
        )

    return candidate_from_row(row)


def upvote_candidate(candidate_id, context):
    timestamp = now_iso()

    with get_connection() as connection:
        previous = ensure_candidate_exists(connection, candidate_id)
        connection.execute(
            """
            UPDATE candidates
            SET upvotes = upvotes + 1, updated_at = ?
            WHERE id = ?
            """,
            (timestamp, candidate_id),
        )
        row = connection.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,)).fetchone()
        write_audit_log(
            connection,
            "upvote",
            candidate_id,
            context,
            {
                "beforeUpvotes": previous["upvotes"],
                "afterUpvotes": row["upvotes"],
            },
        )

    return candidate_from_row(row)


def archive_candidate(candidate_id, context):
    timestamp = now_iso()

    with get_connection() as connection:
        previous = ensure_candidate_exists(connection, candidate_id)
        connection.execute(
            """
            UPDATE candidates
            SET status = 'hidden', updated_at = ?
            WHERE id = ?
            """,
            (timestamp, candidate_id),
        )
        connection.execute(
            """
            UPDATE candidate_comments
            SET status = 'hidden', updated_at = ?
            WHERE candidate_id = ? AND status = 'visible'
            """,
            (timestamp, candidate_id),
        )
        row = connection.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,)).fetchone()
        write_audit_log(
            connection,
            "archive",
            candidate_id,
            context,
            {
                "before": summarize_candidate(previous),
                "afterStatus": "hidden",
            },
        )

    return candidate_from_row(row)


def ensure_candidate_exists(connection, candidate_id):
    row = connection.execute(
        "SELECT * FROM candidates WHERE id = ? AND status != 'hidden'",
        (candidate_id,),
    ).fetchone()
    if row is None:
        raise PublicError(HTTPStatus.NOT_FOUND, "没有找到这条候选。")
    return row


def summarize_candidate(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "city": row["city"],
        "address": row["address"],
        "price": row["price"],
        "tags": json.loads(row["tags"] or "[]"),
        "reason": row["reason"],
        "submitter": row["submitter"],
        "upvotes": row["upvotes"],
        "status": row["status"],
    }


def write_audit_log(connection, action, candidate_id, context, payload):
    payload_text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if len(payload_text) > MAX_AUDIT_PAYLOAD_LENGTH:
        payload_text = payload_text[:MAX_AUDIT_PAYLOAD_LENGTH]

    connection.execute(
        """
        INSERT INTO candidate_audit_logs (
            candidate_id, action, ip, user_agent, payload, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            candidate_id,
            action,
            context["ip"],
            context["userAgent"],
            payload_text,
            now_iso(),
        ),
    )


class PublicError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


class CandidateRequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_json(None, HTTPStatus.NO_CONTENT)

    def do_GET(self):
        try:
            route = self.parse_route()
            if route["action"] == "health":
                self.send_json({"ok": True, "data": {"status": "ok"}})
                return
            if route["action"] == "list":
                self.send_json({"ok": True, "data": list_candidates()})
                return
            if route["action"] == "comments":
                self.send_json({"ok": True, "data": list_candidate_comments(route["id"])})
                return
            raise PublicError(HTTPStatus.NOT_FOUND, "未找到候选名单接口。")
        except PublicError as error:
            self.send_error_json(error.status, error.message)
        except Exception as error:
            print(error)
            self.send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, "候选名单服务暂时不可用。")

    def do_POST(self):
        try:
            self.ensure_allowed_mutation_request(require_json_body=True)
            route = self.parse_route()
            context = self.get_request_context()
            if route["action"] == "list":
                self.send_json(
                    {"ok": True, "data": create_candidate(self.read_json(), context)},
                    HTTPStatus.CREATED,
                )
                return
            if route["action"] == "upvote":
                self.send_json({"ok": True, "data": upvote_candidate(route["id"], context)})
                return
            if route["action"] == "comments":
                self.send_json(
                    {
                        "ok": True,
                        "data": create_candidate_comment(route["id"], self.read_json(), context),
                    },
                    HTTPStatus.CREATED,
                )
                return
            raise PublicError(HTTPStatus.NOT_FOUND, "未找到候选名单接口。")
        except PublicError as error:
            self.send_error_json(error.status, error.message)
        except Exception as error:
            print(error)
            self.send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, "候选名单服务暂时不可用。")

    def do_PATCH(self):
        try:
            self.ensure_allowed_mutation_request(require_json_body=True)
            route = self.parse_route()
            if route["action"] == "detail":
                self.send_json(
                    {
                        "ok": True,
                        "data": update_candidate(
                            route["id"],
                            self.read_json(),
                            self.get_request_context(),
                        ),
                    }
                )
                return
            raise PublicError(HTTPStatus.NOT_FOUND, "未找到候选名单接口。")
        except PublicError as error:
            self.send_error_json(error.status, error.message)
        except Exception as error:
            print(error)
            self.send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, "候选名单服务暂时不可用。")

    def do_DELETE(self):
        try:
            self.ensure_allowed_mutation_request()
            route = self.parse_route()
            if route["action"] == "detail":
                self.send_json(
                    {
                        "ok": True,
                        "data": archive_candidate(route["id"], self.get_request_context()),
                    }
                )
                return
            if route["action"] == "comment_detail":
                self.send_json(
                    {
                        "ok": True,
                        "data": delete_candidate_comment(
                            route["id"],
                            route["commentId"],
                            self.get_request_context(),
                        ),
                    }
                )
                return
            raise PublicError(HTTPStatus.NOT_FOUND, "未找到候选名单接口。")
        except PublicError as error:
            self.send_error_json(error.status, error.message)
        except Exception as error:
            print(error)
            self.send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, "候选名单服务暂时不可用。")

    def read_json(self):
        content_length = int(self.headers.get("Content-Length", "0") or "0")
        if content_length == 0:
            return {}
        if content_length > MAX_BODY_BYTES:
            raise PublicError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "请求内容过大。")

        try:
            return json.loads(self.rfile.read(content_length).decode("utf-8"))
        except json.JSONDecodeError:
            raise PublicError(HTTPStatus.BAD_REQUEST, "请求内容不是合法 JSON。")

    def ensure_allowed_mutation_request(self, require_json_body=False):
        origin = self.headers.get("Origin", "")
        if origin and not resolve_allowed_origin(origin):
            raise PublicError(HTTPStatus.FORBIDDEN, "不允许的请求来源。")

        if require_json_body:
            content_type = self.headers.get("Content-Type", "")
            media_type = content_type.split(";", 1)[0].strip().lower()
            if media_type != "application/json":
                raise PublicError(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "请求内容必须是 JSON。")

    def parse_route(self):
        path = urlparse(self.path).path.strip("/")
        segments = [unquote(segment) for segment in path.split("/") if segment]

        if segments == ["health"]:
            return {"action": "health"}
        if segments == ["candidates"]:
            return {"action": "list"}
        if len(segments) == 2 and segments[0] == "candidates":
            return {"action": "detail", "id": segments[1]}
        if len(segments) == 3 and segments[0] == "candidates" and segments[2] == "comments":
            return {"action": "comments", "id": segments[1]}
        if len(segments) == 3 and segments[0] == "candidates" and segments[2] == "upvote":
            return {"action": "upvote", "id": segments[1]}
        if (
            len(segments) == 4
            and segments[0] == "candidates"
            and segments[2] == "comments"
        ):
            return {"action": "comment_detail", "id": segments[1], "commentId": segments[3]}

        return {"action": "unknown"}

    def send_json(self, payload, status=HTTPStatus.OK):
        body = b"" if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.set_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body:
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def send_error_json(self, status, message):
        self.send_json({"ok": False, "message": message}, status)

    def set_cors_headers(self):
        origin = self.headers.get("Origin", "")
        allowed_origin = resolve_allowed_origin(origin)
        if allowed_origin:
            self.send_header("Access-Control-Allow-Origin", allowed_origin)
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def get_request_context(self):
        return {
            "ip": self.get_client_ip(),
            "userAgent": sanitize_string(self.headers.get("User-Agent"), 200),
        }

    def get_client_ip(self):
        forwarded_for = self.headers.get("X-Forwarded-For", "")
        if forwarded_for:
            return sanitize_string(forwarded_for.split(",")[0], 80)
        real_ip = self.headers.get("X-Real-IP", "")
        if real_ip:
            return sanitize_string(real_ip, 80)
        return sanitize_string(self.client_address[0], 80)

    def log_message(self, format_string, *args):
        print(f"{self.address_string()} - {format_string % args}")


def resolve_allowed_origin(origin):
    if "*" in ALLOWED_ORIGINS:
        return origin or "*"
    if origin in ALLOWED_ORIGINS:
        return origin
    return ""


def main():
    init_database()
    server = ThreadingHTTPServer((HOST, PORT), CandidateRequestHandler)
    print(f"Candidate API listening on http://{HOST}:{PORT}")
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
