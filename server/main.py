import os
import uuid
import imghdr
import secrets
import random
import re
import logging
from datetime import datetime, timedelta, timezone
from functools import wraps

import base64
import hashlib
import urllib.parse
import requests as http_requests
from flask import Flask, jsonify, request, send_from_directory, redirect, session
from flask_cors import CORS

# It is very green, but it's not mean
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from pyairtable import Api
from dotenv import load_dotenv

from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

from cachetools import TTLCache, cached

load_dotenv()

# Configuration

BASE_URL         = os.getenv("BASE_URL")
PORT             = os.getenv("PORT")
AIRTABLE_TOKEN   = os.getenv("AIRTABLE_TOKEN")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID")
ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS_RAW.split(",") if o.strip()]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

api = Api(AIRTABLE_TOKEN, timeout=30)

users_table      = api.table(AIRTABLE_BASE_ID, "Users")
tasks_table      = api.table(AIRTABLE_BASE_ID, "Tasks")
families_table   = api.table(AIRTABLE_BASE_ID, "Families")
membership_table = api.table(AIRTABLE_BASE_ID, "Family Membership")
tags_table       = api.table(AIRTABLE_BASE_ID, "Competitive Tags")
proposed_table   = api.table(AIRTABLE_BASE_ID, "Proposed tag changes")
labels_table     = api.table(AIRTABLE_BASE_ID, "Labels")
folders_table    = api.table(AIRTABLE_BASE_ID, "Folders")
posts_table      = api.table(AIRTABLE_BASE_ID, "Posts")
comments_table   = api.table(AIRTABLE_BASE_ID, "Comments")
timers_table     = api.table(AIRTABLE_BASE_ID, "Timers")
notifs_table     = api.table(AIRTABLE_BASE_ID, "Notifications")
locations_table  = api.table(AIRTABLE_BASE_ID, "Locations")
invites_table    = api.table(AIRTABLE_BASE_ID, "Invites")

GOOGLE_CLIENT_ID       = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET   = os.getenv("GOOGLE_CLIENT_SECRET", "")
FACEBOOK_CLIENT_ID     = os.getenv("FACEBOOK_CLIENT_ID", "")
FACEBOOK_CLIENT_SECRET = os.getenv("FACEBOOK_CLIENT_SECRET", "")
X_CLIENT_ID            = os.getenv("X_CLIENT_ID", "")
X_CLIENT_SECRET        = os.getenv("X_CLIENT_SECRET", "")
DISCORD_CLIENT_ID      = os.getenv("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET  = os.getenv("DISCORD_CLIENT_SECRET", "")

_OAUTH_CREDS = {
    "google":   {"client_id": GOOGLE_CLIENT_ID,   "client_secret": GOOGLE_CLIENT_SECRET},
    "facebook": {"client_id": FACEBOOK_CLIENT_ID, "client_secret": FACEBOOK_CLIENT_SECRET},
    "x":        {"client_id": X_CLIENT_ID,        "client_secret": X_CLIENT_SECRET},
    "discord":  {"client_id": DISCORD_CLIENT_ID,  "client_secret": DISCORD_CLIENT_SECRET},
}

UPLOAD_FOLDER      = os.path.join(os.getcwd(), "uploads")
STATIC_FOLDER      = os.path.join(os.getcwd(), "static")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
ALLOWED_MIME_TYPES = {"png", "jpeg", "gif", "webp", "rgbe"}
AVATAR_COUNT       = 6

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__, static_folder="dist")
app.config["UPLOAD_FOLDER"]      = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024

app.secret_key = os.getenv("FLASK_SECRET_KEY", secrets.token_hex(32))

CORS(app, origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else [f"http://localhost:{PORT}"], supports_credentials=True)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],
    storage_uri="memory://",
)


# Helpers

def first(val, fallback=None):
    if isinstance(val, list):
        return val[0] if val else fallback
    return val if val is not None else fallback


def handle(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        logger.error(f"Error in {fn.__name__}: {type(e).__name__}: {e}")
        return None


def safe_str(val):
    return str(val).replace("'", "\\'").replace('"', '\\"').replace("\n", "").replace("\r", "")


_label_cache    = TTLCache(maxsize=500,  ttl=3600)
_username_cache = TTLCache(maxsize=1000, ttl=1800)
_oauth_cache    = TTLCache(maxsize=10,   ttl=3600)
_pkce_store     = TTLCache(maxsize=200,  ttl=600)
_user_cache     = TTLCache(maxsize=500,  ttl=300)
_tag_cache      = TTLCache(maxsize=500,  ttl=600)


# Avatar resolution

def resolve_avatar_fields(fields):
    pics = fields.get("Profile_Picture", [])
    if pics and isinstance(pics, list):
        url = pics[0].get("url", "") if isinstance(pics[0], dict) else str(pics[0])
        if url:
            return [{"url": url}]

    avatar_id = fields.get("Default_Avatar_ID")
    if avatar_id:
        return [{"url": f"{BASE_URL}/static/avatars/no-profile_{int(avatar_id)}.png"}]

    return []


@cached(cache=_label_cache)
def resolve_label_name(label_id):
    record = handle(labels_table.get, label_id)
    return record["fields"].get("Name", "") if record else ""


def resolve_label_names(label_ids):
    if not label_ids:
        return []
    names = [resolve_label_name(lid) for lid in label_ids]
    return [n for n in names if n]


def get_user_cached(user_id):
    if not user_id:
        return None
    if user_id in _user_cache:
        return _user_cache[user_id]
    record = handle(users_table.get, user_id)
    _user_cache[user_id] = record
    return record


def get_tag_cached(tag_id):
    if not tag_id:
        return None
    if tag_id in _tag_cache:
        return _tag_cache[tag_id]
    record = handle(tags_table.get, tag_id)
    _tag_cache[tag_id] = record
    return record


def get_request_user_id():
    return request.headers.get("X-User-Id", "").strip()

# OAuth Config

def get_oauth_creds(provider):
    creds = _OAUTH_CREDS.get(provider)
    if not creds or not creds["client_id"]:
        logger.warning(f"OAuth config missing for provider: {provider}")
        return None
    return creds


# Auth

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        uid = get_request_user_id()
        if not uid or not uid.startswith("rec"):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def owns_record(record_fields, owner_key="Owner"):
    uid = get_request_user_id()
    owners = record_fields.get(owner_key, [])
    if isinstance(owners, list):
        return uid in owners
    return uid == owners


# Static

@app.route("/static/<path:filename>")
def serve_static(filename):
    return send_from_directory(STATIC_FOLDER, filename)


@app.route("/uploads/<filename>")
def serve_uploaded_file(filename):
    safe_name = secure_filename(filename)
    return send_from_directory(app.config["UPLOAD_FOLDER"], safe_name)


# Register / Login

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@app.route("/api/register", methods=["POST"])
@limiter.limit("10 per hour")
def register():
    data = request.json or {}
    username     = str(data.get("username", "")).strip()
    password     = str(data.get("password", "")).strip()
    display_name = str(data.get("display_name", "")).strip() or username
    email        = str(data.get("email", "")).strip().lower()
    is_private   = data.get("is_private", False)

    avatar_num = random.randint(1, AVATAR_COUNT)

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    if not email or not EMAIL_RE.match(email):
        return jsonify({"error": "A valid email is required"}), 400
    if len(username) < 3 or len(username) > 30:
        return jsonify({"error": "Username must be 3–30 characters"}), 400
    if not all(c.isalnum() or c in "_-" for c in username):
        return jsonify({"error": "Username may only contain letters, numbers, _ and -"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    existing = users_table.all(formula=f"{{Username}}='{safe_str(username)}'")
    if existing:
        return jsonify({"error": "Username already taken"}), 409

    existing_email = users_table.all(formula=f"LOWER({{Email}})='{safe_str(email)}'")
    if existing_email:
        return jsonify({"error": "Email already registered"}), 409

    hashed = generate_password_hash(password)
    new_record = users_table.create({
        "Username":         username,
        "Display Name":     display_name[:60],
        "Email":            email,
        "Password":         hashed,
        "Streak":           0,
        "Private":          is_private,
        "Default_Avatar_ID": avatar_num,
    })
    return jsonify({"success": True, "user": _format_user(new_record)}), 201


@app.route("/api/login", methods=["POST"])
@limiter.limit("20 per hour")
def login():
    data       = request.json or {}
    identifier = str(data.get("identifier", "")).strip().lower()
    password   = str(data.get("password", "")).strip()

    if not identifier or not password:
        return jsonify({"error": "Invalid username or password."}), 401

    safe_id = safe_str(identifier)
    formula = f"OR(LOWER({{Email}})='{safe_id}', LOWER({{Username}})='{safe_id}')"
    records = users_table.all(formula=formula)

    if not records:
        return jsonify({"error": "Invalid username or password."}), 401

    user = records[0]
    stored_hash = user["fields"].get("Password", "")
    if not check_password_hash(stored_hash, password):
        return jsonify({"error": "Invalid username or password."}), 401

    return jsonify({"success": True, "user": _format_user(user)}), 200


# Users

@app.route("/api/users")
@limiter.limit("30 per minute")
def get_users():
    username = request.args.get("username", "")
    if username:
        records = users_table.all(formula=f"{{Username}}='{safe_str(username)}'")
    else:
        records = users_table.all()
    return jsonify([_format_user(r) for r in records])


@app.route("/api/users/<record_id>")
@limiter.limit("60 per minute")
def get_user(record_id):
    record = handle(users_table.get, record_id)
    if not record:
        return jsonify({"error": "User not found"}), 404
    return jsonify(_format_user(record))


@app.route("/api/users/<record_id>", methods=["PUT"])
@require_auth
@limiter.limit("20 per minute")
def update_user(record_id):
    if get_request_user_id() != record_id:
        return jsonify({"error": "Forbidden"}), 403

    data   = request.json or {}
    fields = {}

    if "username" in data:
        new_username = str(data["username"]).strip()
        existing     = users_table.all(formula=f"{{Username}}='{safe_str(new_username)}'")
        conflict     = [r for r in existing if r["id"] != record_id]
        if conflict:
            return jsonify({"error": "Username already taken"}), 409
        fields["Username"] = new_username

    if "display_name" in data:
        fields["Display Name"] = str(data["display_name"])[:60]
    if "is_private" in data:
        fields["Private"] = bool(data["is_private"])

    current        = handle(users_table.get, record_id)
    current_fields = current["fields"] if current else {}

    if "avatar_url" in data:
        _delete_local_upload(current_fields.get("Profile_Picture", []))
        fields["Profile_Picture"] = [{"url": data["avatar_url"]}]
    if "banner_url" in data:
        _delete_local_upload(current_fields.get("Banner", []))
        fields["Banner"] = [{"url": data["banner_url"]}]
    if "friends" in data:
        fields["Friends"] = data["friends"]
    if "streak" in data:
        fields["Streak"] = int(data["streak"])

    try:
        users_table.update(record_id, fields)
        updated = handle(users_table.get, record_id)
        return jsonify({"success": True, "user": _format_user(updated) if updated else {}})
    except Exception as e:
        logger.error(f"Failed to update user {record_id}: {e}")
        return jsonify({"error": "Failed to update user"}), 400


def _format_user(record):
    f = record["fields"]
    return {
        "id":               record["id"],
        "username":         f.get("Username", ""),
        "display_name":     f.get("Display Name", ""),
        "email":            f.get("Email", ""),
        "avatar":           resolve_avatar_fields(f),
        "banner":           f.get("Banner", ""),
        "streak":           f.get("Streak", 0),
        "friends":          f.get("Friends", []),
        "families":         f.get("Families", []),
        "is_private":       f.get("Private", False),
        "default_avatar_id": f.get("Default_Avatar_ID"),
    }


# Tasks

@app.route("/api/tasks")
@require_auth
@limiter.limit("60 per minute")
def get_tasks():
    owner_id = request.args.get("owner")
    if owner_id and owner_id != get_request_user_id():
        return jsonify({"error": "Forbidden"}), 403
    records = tasks_table.all()
    if owner_id:
        records = [r for r in records if owner_id in r["fields"].get("Owner", [])]
    return jsonify([_format_task(r) for r in records])


@app.route("/api/tasks/<record_id>", methods=["GET"])
@require_auth
def get_task(record_id):
    record = handle(tasks_table.get, record_id)
    if not record:
        return jsonify({"error": "Task not found"}), 404
    if not owns_record(record["fields"]):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(_format_task(record))


@app.route("/api/tasks", methods=["POST"])
@require_auth
@limiter.limit("30 per minute")
def create_task():
    data = request.json or {}
    uid  = get_request_user_id()
    fields = {
        "Name":   str(data.get("name", ""))[:200],
        "Status": data.get("status", "Incomplete"),
        "Priority": data.get("priority"),
        "Repeat": data.get("repeat", "None"),
        "Owner":  [uid],
    }

    if data.get("description"):
        fields["Description"] = str(data["description"])[:2000]
    if data.get("competitive_tags"):
        fields["Competitive Tags"] = data["competitive_tags"]
    if data.get("pinned"):
        fields["Pinned"] = True
    if data.get("time"):
        fields["Time"] = data["time"]
    if data.get("location"):
        fields["Location"] = data["location"]
    if data.get("folders"):
        fields["Folders"] = data["folders"]
    if data.get("family"):
        fields["Family"] = data["family"]
    if data.get("is_private"):
        fields["Private"] = True

    try:
        new_record = tasks_table.create(fields)
        return jsonify({"success": True, "task": _format_task(new_record)}), 201
    except Exception as e:
        logger.error(f"Failed to create task: {e}")
        return jsonify({"error": "Failed to create task"}), 500


@app.route("/api/tasks/<record_id>", methods=["PUT"])
@require_auth
@limiter.limit("60 per minute")
def update_task(record_id):
    record = handle(tasks_table.get, record_id)
    if not record:
        return jsonify({"error": "Task not found"}), 404
    if not owns_record(record["fields"]):
        return jsonify({"error": "Forbidden"}), 403

    data   = request.json or {}
    fields = {}
    if "status"           in data: fields["Status"]           = data["status"]
    if "pinned"           in data: fields["Pinned"]           = bool(data["pinned"])
    if "name"             in data: fields["Name"]             = str(data["name"])[:200]
    if "description"      in data: fields["Description"]      = str(data["description"])[:2000]
    if "competitive_tags" in data: fields["Competitive Tags"] = data["competitive_tags"]
    if "time"             in data: fields["Time"]             = data["time"]
    if "priority"         in data: fields["Priority"]         = data["priority"]
    if "folders"          in data: fields["Folders"]          = data["folders"]
    if "repeat"           in data: fields["Repeat"]           = data["repeat"]
    if "is_private"       in data: fields["Private"]          = bool(data["is_private"])
    if "location"         in data: fields["Location"]         = data["location"]

    try:
        tasks_table.update(record_id, fields)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to update task {record_id}: {e}")
        return jsonify({"error": "Failed to update task"}), 400


@app.route("/api/tasks/<record_id>", methods=["DELETE"])
@require_auth
def delete_task(record_id):
    record = handle(tasks_table.get, record_id)
    if not record:
        return jsonify({"error": "Task not found"}), 404
    if not owns_record(record["fields"]):
        return jsonify({"error": "Forbidden"}), 403
    try:
        tasks_table.delete(record_id)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to delete task {record_id}: {e}")
        return jsonify({"error": "Failed to delete task"}), 400


def _format_task(record):
    f = record["fields"]
    competitive_tag_ids   = f.get("Competitive Tags", [])
    competitive_tag_names = []
    for tag_id in competitive_tag_ids:
        tag_record = get_tag_cached(tag_id)
        if tag_record:
            competitive_tag_names.append(tag_record["fields"].get("Tag Name", ""))
    return {
        "id":                   record["id"],
        "name":                 f.get("Name", ""),
        "description":          f.get("Description", ""),
        "competitive_tags":     competitive_tag_names,
        "competitive_tag_ids":  competitive_tag_ids,
        "status":               f.get("Status", "Incomplete"),
        "is_private":           f.get("Private", False),
        "pinned":               f.get("Pinned", False),
        "time":                 f.get("Time", None),
        "location":             first(f.get("Location"), ""),
        "repeat":               f.get("Repeat", "None"),
        "priority":             f.get("Priority"),
        "owner":                first(f.get("Owner"), ""),
        "folder":               f.get("Folders", []),
        "family":               f.get("Family", []),
    }


# Folders

@app.route("/api/folders")
@require_auth
def get_folders():
    uid = get_request_user_id()
    try:
        records = folders_table.all(sort=["Order"])
        if uid:
            records = [r for r in records if uid in r["fields"].get("Owner", [])]
        folders = [
            {
                "id":         r["id"],
                "name":       r["fields"].get("Name", ""),
                "task_count": len(r["fields"].get("Tasks", [])),
            }
            for r in records
        ]
        return jsonify(folders)
    except Exception as e:
        logger.error(f"Failed to fetch folders: {e}")
        return jsonify({"error": "Failed to fetch folders"}), 500

@app.route("/api/folders/reorder", methods=["POST"])
@require_auth
def reorder_folders():
    order = request.json.get("order", [])
    try:
        updates = [{"id": folder_id, "fields": {"Order": i}} for i, folder_id in enumerate(order)]
        folders_table.batch_update(updates)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to reorder folders: {e}")
        return jsonify({"error": "Failed to reorder"}), 500

@app.route("/api/folders", methods=["POST"])
@require_auth
def create_folder():
    data = request.json or {}
    uid  = get_request_user_id()
    try:
        new_record = folders_table.create({
            "Name":  str(data.get("name", ""))[:100],
            "Owner": [uid],
        })
        return jsonify({"success": True, "id": new_record["id"]}), 201
    except Exception as e:
        logger.error(f"Failed to create folder: {e}")
        return jsonify({"error": "Failed to create folder"}), 500


@app.route("/api/folders/<folder_id>", methods=["PUT"])
@require_auth
def update_folder(folder_id):
    record = handle(folders_table.get, folder_id)
    if not record:
        return jsonify({"error": "Not found"}), 404
    if not owns_record(record["fields"]):
        return jsonify({"error": "Forbidden"}), 403
    data = request.json or {}
    try:
        folders_table.update(folder_id, {"Name": str(data.get("name", ""))[:100]})
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to update folder {folder_id}: {e}")
        return jsonify({"error": "Failed to update folder"}), 400


@app.route("/api/folders/<folder_id>", methods=["DELETE"])
@require_auth
def delete_folder(folder_id):
    record = handle(folders_table.get, folder_id)
    if not record:
        return jsonify({"error": "Not found"}), 404
    if not owns_record(record["fields"]):
        return jsonify({"error": "Forbidden"}), 403
    try:
        folders_table.delete(folder_id)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to delete folder {folder_id}: {e}")
        return jsonify({"error": "Failed to delete folder"}), 400


# Labels

@app.route("/api/labels")
@require_auth
def get_labels():
    owner_id = request.args.get("owner")
    if owner_id and owner_id != get_request_user_id():
        return jsonify({"error": "Forbidden"}), 403
    if owner_id:
        records = labels_table.all(formula=f"FIND('{safe_str(owner_id)}', ARRAYJOIN({{Owner}}))")
    else:
        records = labels_table.all()
    return jsonify([
        {
            "id":    r["id"],
            "name":  r["fields"].get("Name", ""),
            "color": r["fields"].get("Color", "#7C3AED"),
            "owner": r["fields"].get("Owner", []),
        }
        for r in records
    ])


@app.route("/api/labels", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def create_label():
    data = request.json or {}
    uid  = get_request_user_id()
    try:
        new_record = labels_table.create({
            "Name":  str(data.get("name", ""))[:60],
            "Color": data.get("color", "#7C3AED"),
            "Owner": [uid],
        })
        _label_cache.pop(new_record["id"], None)
        return jsonify({"success": True, "id": new_record["id"]}), 201
    except Exception as e:
        logger.error(f"Failed to create label: {e}")
        return jsonify({"error": "Failed to create label"}), 500


@app.route("/api/labels/<label_id>", methods=["DELETE"])
@require_auth
def delete_label(label_id):
    record = handle(labels_table.get, label_id)
    if not record:
        return jsonify({"error": "Not found"}), 404
    if not owns_record(record["fields"]):
        return jsonify({"error": "Forbidden"}), 403
    try:
        labels_table.delete(label_id)
        _label_cache.pop(label_id, None)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to delete label {label_id}: {e}")
        return jsonify({"error": "Failed to delete label"}), 400


# Families

@app.route("/api/families")
@limiter.limit("30 per minute")
def get_families():
    records = families_table.all()
    return jsonify([_format_family(r) for r in records])


@app.route("/api/families/<record_id>")
def get_family(record_id):
    record = handle(families_table.get, record_id)
    if not record:
        return jsonify({"error": "Family not found"}), 404
    return jsonify(_format_family(record))


@app.route("/api/families", methods=["POST"])
@require_auth
@limiter.limit("10 per hour")
def create_family():
    data = request.json or {}
    uid  = get_request_user_id()
    fields = {
        "Name":            str(data.get("name", ""))[:100],
        "Rank Pts Spacing": data.get("rank_pts_spacing", 1000),
    }
    if uid:
        fields["Users"] = [uid]

    try:
        new_record = families_table.create(fields)
        family_id  = new_record["id"]

        user_record = handle(users_table.get, uid)
        if user_record:
            username         = user_record["fields"].get("Username", "")
            membership_table.create({
                "User":   username,
                "Users":  [uid],
                "Family": [family_id],
                "Points": 0,
                "Role":   "Owner",
            })
            current_families = user_record["fields"].get("Families", []) or []
            if family_id not in current_families:
                current_families.append(family_id)
                users_table.update(uid, {"Families": current_families})

        return jsonify({"success": True, "id": family_id}), 201
    except Exception as e:
        logger.error(f"Failed to create family: {e}")
        return jsonify({"error": "Failed to create family"}), 500


@app.route("/api/families/<record_id>", methods=["PUT"])
@require_auth
def update_family(record_id):
    data   = request.json or {}
    fields = {}
    if "name" in data:
        fields["Name"] = str(data["name"])[:100]
    if "can_invite" in data and data["can_invite"] in ("Everyone", "Admin Only"):
        fields["Can Invite"] = data["can_invite"]
    if "rank_pts_spacing" in data:
        fields["Rank Pts Spacing"] = int(data["rank_pts_spacing"])
    try:
        families_table.update(record_id, fields)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to update family {record_id}: {e}")
        return jsonify({"error": "Failed to update family"}), 400


@app.route("/api/families/<record_id>", methods=["DELETE"])
@require_auth
def delete_family(record_id):
    uid     = get_request_user_id()
    members = membership_table.all(
        formula=f"FIND('{safe_str(record_id)}', ARRAYJOIN({{Family}}))"
    )
    is_owner = any(
        m["fields"].get("Role") == "Owner" and
        uid in (m["fields"].get("Users") or [])
        for m in members
    )
    if not is_owner:
        return jsonify({"error": "Forbidden — only the Owner can delete"}), 403

    try:
        for m in members:
            handle(membership_table.delete, m["id"])
        families_table.delete(record_id)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to delete family {record_id}: {e}")
        return jsonify({"error": "Failed to delete family"}), 400


def _format_family(record):
    f = record["fields"]
    return {
        "id":               record["id"],
        "name":             f.get("Name", ""),
        "rank_pts_spacing": f.get("Rank Pts Spacing", 0),
        "members":          f.get("Users", []),
        "tags":             f.get("Tags", []),
        "can_invite":       f.get("Can Invite") or "Everyone",
    }


# Memberships

@cached(cache=_username_cache)
def get_user_by_username_cached(username):
    records = users_table.all(formula=f"{{Username}}='{safe_str(username)}'")
    return records[0]["fields"] if records else {}


def get_user_by_username(username):
    if not username:
        return {}
    return get_user_by_username_cached(username)


def _format_member_from_fields(membership_record, user_fields):
    uf = user_fields
    return {
        "id":               membership_record["id"],
        "username":         uf.get("Username", ""),
        "display_name":     uf.get("Display Name", ""),
        # resolve_avatar_fields handles Default_Avatar_ID fallback
        "avatar":           resolve_avatar_fields(uf),
        "points":           membership_record["fields"].get("Points", 0),
        "role":             membership_record["fields"].get("Role", "Member"),
    }


@app.route("/api/families/<family_id>/members")
def get_members(family_id):
    records = membership_table.all(
        formula=f"FIND('{safe_str(family_id)}', ARRAYJOIN({{Family}}))"
    )
    members = []
    for r in records:
        username = r["fields"].get("User", "")
        uf       = get_user_by_username(username)
        members.append(_format_member_from_fields(r, uf))
    members.sort(key=lambda m: m["points"], reverse=True)
    return jsonify(members)


@app.route("/api/families/<family_id>/members", methods=["POST"])
@require_auth
@limiter.limit("30 per minute")
def add_member(family_id):
    data     = request.json or {}
    username = safe_str(data.get("username", "").strip())
    records  = users_table.all(formula=f"{{Username}}='{username}'")
    if not records:
        return jsonify({"error": "User not found"}), 404

    user_record = records[0]
    uid         = user_record["id"]

    existing_memberships = membership_table.all(
        formula=f"AND({{User}}='{username}', FIND('{safe_str(family_id)}', ARRAYJOIN({{Family}})))"
    )
    if existing_memberships:
        return jsonify({"error": "User is already a member"}), 409

    try:
        new_record = membership_table.create({
            "User":   username,
            "Users":  [uid],
            "Family": [family_id],
            "Points": 0,
            "Role":   "Member",
        })

        current_families = user_record["fields"].get("Families", []) or []
        if family_id not in current_families:
            current_families.append(family_id)
            users_table.update(uid, {"Families": current_families})

        return jsonify({"success": True, "id": new_record["id"]}), 201
    except Exception as e:
        logger.error(f"Failed to add member to family {family_id}: {e}")
        return jsonify({"error": "Failed to add member"}), 500


@app.route("/api/memberships/<record_id>", methods=["DELETE"])
@require_auth
def delete_membership(record_id):
    record = handle(membership_table.get, record_id)
    if not record:
        return jsonify({"error": "Not found"}), 404
    try:
        membership_table.delete(record_id)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to delete membership {record_id}: {e}")
        return jsonify({"error": "Failed to delete membership"}), 400


@app.route("/api/memberships/<record_id>/role", methods=["PUT"])
@require_auth
def update_membership_role(record_id):
    data = request.json or {}
    role = data.get("role")
    if role not in ("Member", "Admin"):
        return jsonify({"error": "Role must be 'Member' or 'Admin'"}), 400
    try:
        membership_table.update(record_id, {"Role": role})
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to update membership role {record_id}: {e}")
        return jsonify({"error": "Failed to update role"}), 400


@app.route("/api/memberships/<record_id>/points", methods=["PUT"])
@require_auth
def update_membership_points(record_id):
    data   = request.json or {}
    record = handle(membership_table.get, record_id)
    if not record:
        return jsonify({"error": "Not found"}), 404

    if "points" in data:
        new_points = int(data["points"])
    elif "add_points" in data:
        current    = record["fields"].get("Points", 0)
        new_points = current + int(data["add_points"])
    else:
        return jsonify({"error": "Provide 'points' or 'add_points'"}), 400

    try:
        membership_table.update(record_id, {"Points": new_points})
        return jsonify({"success": True, "points": new_points})
    except Exception as e:
        logger.error(f"Failed to update membership points {record_id}: {e}")
        return jsonify({"error": "Failed to update points"}), 400


# Competitive Tags

@app.route("/api/families/<family_id>/tags")
def get_tags(family_id):
    records = tags_table.all(formula=f"FIND('{safe_str(family_id)}', ARRAYJOIN({{Family}}))")
    return jsonify([
        {
            "id":           r["id"],
            "name":         r["fields"].get("Tag Name", ""),
            "points_value": r["fields"].get("Points Value", 0),
            "color":        r["fields"].get("Color", "#7C3AED"),
            "created_by":   first(r["fields"].get("Created By"), ""),
        }
        for r in records
    ])


@app.route("/api/families/<family_id>/tags", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def create_tag(family_id):
    data = request.json or {}
    uid  = get_request_user_id()
    try:
        new_record = tags_table.create({
            "Tag Name":    str(data.get("name", ""))[:60],
            "Points Value": int(data.get("points_value", 0)),
            "Color":       data.get("color", "#7C3AED"),
            "Family":      [family_id],
            "Created By":  [uid],
        })
        return jsonify({"success": True, "id": new_record["id"]}), 201
    except Exception as e:
        logger.error(f"Failed to create tag for family {family_id}: {e}")
        return jsonify({"error": "Failed to create tag"}), 500


@app.route("/api/families/<family_id>/tags/<tag_id>", methods=["PUT"])
@require_auth
def update_tag(family_id, tag_id):
    record = handle(tags_table.get, tag_id)
    if not record:
        return jsonify({"error": "Tag not found"}), 404
    data   = request.json or {}
    fields = {}
    if "name"         in data: fields["Tag Name"]    = str(data["name"])[:60]
    if "points_value" in data: fields["Points Value"] = int(data["points_value"])
    if "color"        in data: fields["Color"]        = data["color"]
    try:
        tags_table.update(tag_id, fields)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to update tag {tag_id}: {e}")
        return jsonify({"error": "Failed to update tag"}), 400


@app.route("/api/families/<family_id>/tags/<tag_id>", methods=["DELETE"])
@require_auth
def delete_tag(family_id, tag_id):
    record = handle(tags_table.get, tag_id)
    if not record:
        return jsonify({"error": "Tag not found"}), 404
    try:
        tags_table.delete(tag_id)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to delete tag {tag_id}: {e}")
        return jsonify({"error": "Failed to delete tag"}), 400


# Proposed Tags

@app.route("/api/families/<family_id>/proposed_tags")
def get_proposed_tags(family_id):
    records = proposed_table.all(formula=f"FIND('{safe_str(family_id)}', ARRAYJOIN({{Family}}))")
    return jsonify([
        {
            "id":          r["id"],
            "name":        r["fields"].get("Tag Name", ""),
            "proposed_by": r["fields"].get("Proposed By", ""),
            "points_value": r["fields"].get("Points Value", 0),
            "status":      r["fields"].get("Status", "Pending"),
        }
        for r in records
    ])


@app.route("/api/proposed_tags", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def propose_tag():
    data        = request.json or {}
    uid         = get_request_user_id()
    user_record = handle(users_table.get, uid)
    proposed_by = user_record["fields"].get("Username", "") if user_record else ""

    try:
        new_record = proposed_table.create({
            "Tag Name":    str(data.get("name", ""))[:60],
            "Points Value": int(data.get("points_value", 0)),
            "Family":      [data.get("family_id")],
            "Proposed By": proposed_by,
            "Status":      "Pending",
        })
        return jsonify({"success": True, "id": new_record["id"]}), 201
    except Exception as e:
        logger.error(f"Failed to propose tag: {e}")
        return jsonify({"error": "Failed to propose tag"}), 500


@app.route("/api/proposed_tags/<record_id>", methods=["PUT"])
@require_auth
def update_proposed_tag(record_id):
    data   = request.json or {}
    fields = {}
    if "status" in data:
        status = data["status"]
        if status not in ("Pending", "Approved", "Rejected"):
            return jsonify({"error": "Invalid status"}), 400
        fields["Status"] = status
    if "name"         in data: fields["Tag Name"]    = str(data["name"])[:60]
    if "points_value" in data: fields["Points Value"] = int(data["points_value"])
    try:
        proposed_table.update(record_id, fields)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to update proposed tag {record_id}: {e}")
        return jsonify({"error": "Failed to update proposed tag"}), 400


@app.route("/api/proposed_tags/<record_id>", methods=["DELETE"])
@require_auth
def delete_proposed_tag(record_id):
    try:
        proposed_table.delete(record_id)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to delete proposed tag {record_id}: {e}")
        return jsonify({"error": "Failed to delete proposed tag"}), 400


# Invites

@app.route("/api/families/<family_id>/invite-link", methods=["POST"])
@require_auth
@limiter.limit("10 per hour")
def create_invite_link(family_id):
    token      = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    uid        = get_request_user_id()
    try:
        invites_table.create({
            "Token":      token,
            "Family":     [family_id],
            "Expires At": expires_at,
            "Used":       False,
            "Created By": [uid],
        })
    except Exception as e:
        logger.error(f"Failed to create invite link: {e}")
        return jsonify({"error": "Failed to create invite"}), 400
    return jsonify({"invite_url": f"{BASE_URL}/join/{token}", "expires_at": expires_at}), 201


@app.route("/api/invite/<token>")
@limiter.limit("20 per minute")
def get_invite(token):
    if len(token) > 64 or not token.replace("-", "").replace("_", "").isalnum():
        return jsonify({"error": "Invalid token"}), 400
    records = invites_table.all(formula=f"{{Token}}='{safe_str(token)}'")
    if not records:
        return jsonify({"error": "Invalid invite link"}), 404
    invite = records[0]["fields"]
    if invite.get("Used"):
        return jsonify({"error": "Invite already used"}), 410
    expires_at = invite.get("Expires At", "")
    if expires_at:
        try:
            if datetime.now(timezone.utc) > datetime.fromisoformat(expires_at):
                return jsonify({"error": "Invite link expired"}), 410
        except ValueError:
            pass
    family_id     = first(invite.get("Family"), None)
    family_record = handle(families_table.get, family_id) if family_id else None
    family_name   = family_record["fields"].get("Name", "") if family_record else ""
    members       = []
    if family_id:
        member_records = membership_table.all(
            formula=f"FIND('{safe_str(family_id)}', ARRAYJOIN({{Family}}))"
        )
        for r in member_records:
            username = r["fields"].get("User", "")
            uf       = get_user_by_username(username)
            members.append(_format_member_from_fields(r, uf))
        members.sort(key=lambda m: m["points"], reverse=True)
    return jsonify({
        "family_id":   family_id,
        "family_name": family_name,
        "expires_at":  expires_at,
        "members":     members,
    })


@app.route("/api/invite/<token>/accept", methods=["POST"])
@require_auth
@limiter.limit("10 per hour")
def accept_invite(token):
    if len(token) > 64:
        return jsonify({"error": "Invalid token"}), 400
    uid     = get_request_user_id()
    records = invites_table.all(formula=f"{{Token}}='{safe_str(token)}'")
    if not records:
        return jsonify({"error": "Invalid invite link"}), 404
    invite_record = records[0]
    invite        = invite_record["fields"]
    if invite.get("Used"):
        return jsonify({"error": "Invite already used"}), 410
    expires_at = invite.get("Expires At", "")
    if expires_at:
        try:
            if datetime.now(timezone.utc) > datetime.fromisoformat(expires_at):
                return jsonify({"error": "Invite link expired"}), 410
        except ValueError:
            pass
    family_id   = first(invite.get("Family"), None)
    if not family_id:
        return jsonify({"error": "Family not found"}), 404
    user_record = handle(users_table.get, uid)
    if not user_record:
        return jsonify({"error": "User not found"}), 404
    username = user_record["fields"].get("Username", "")
    existing = membership_table.all(
        formula=f"AND({{User}}='{safe_str(username)}', FIND('{safe_str(family_id)}', ARRAYJOIN({{Family}})))"
    )
    if existing:
        return jsonify({"error": "Already a member of this group"}), 409
    try:
        membership_table.create({
            "User":   username,
            "Family": [family_id],
            "Users":  [uid],
            "Points": 0,
            "Role":   "Member",
        })
        current_families = user_record["fields"].get("Families", []) or []
        if family_id not in current_families:
            current_families.append(family_id)
            users_table.update(uid, {"Families": current_families})
        invites_table.update(invite_record["id"], {"Used": True})
    except Exception as e:
        logger.error(f"Failed to accept invite {token}: {e}")
        return jsonify({"error": "Failed to accept invite"}), 400
    return jsonify({"success": True, "family_id": family_id})


# Posts

@app.route("/api/families/<family_id>/posts")
def get_posts(family_id):
    records = posts_table.all(
        formula=f"FIND('{safe_str(family_id)}', ARRAYJOIN({{Family}}))"
    )
    return jsonify([_format_post(r) for r in records])


@app.route("/api/posts/<record_id>")
def get_post(record_id):
    record = handle(posts_table.get, record_id)
    if not record:
        return jsonify({"error": "Post not found"}), 404
    return jsonify(_format_post(record))


@app.route("/api/posts", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def create_post():
    data      = request.json or {}
    uid       = get_request_user_id()
    post_type = data.get("type", "Task Completed")
    family_id = data.get("family_id")
    fields    = {
        "Title":       str(data.get("title", ""))[:200],
        "Description": str(data.get("description", ""))[:2000],
        "Family":      [family_id] if family_id else [],
        "Author":      [uid],
        "Users":       [uid],
        "Type":        post_type,
        "Status":      data.get("status", "Pending"),
        "Upvotes":     0,
        "Downvotes":   0,
    }
    if data.get("related_task"):
        fields["Related Task"] = [data["related_task"]]
    if data.get("tags"):
        fields["Competitive Tags"] = data["tags"]
    if data.get("photo_url"):
        fields["Attachments"] = [{"url": data["photo_url"]}]
    try:
        new_record = posts_table.create(fields)
        return jsonify({"success": True, "post": _format_post(new_record)}), 201
    except Exception as e:
        logger.error(f"Error creating post: {e}")
        return jsonify({"error": "Failed to create post"}), 500


@app.route("/api/posts/<record_id>", methods=["PUT"])
@require_auth
def update_post(record_id):
    record = handle(posts_table.get, record_id)
    if not record:
        return jsonify({"error": "Post not found"}), 404
    data   = request.json or {}
    fields = {}
    if "status"      in data: fields["Status"]           = data["status"]
    if "title"       in data: fields["Title"]            = str(data["title"])[:200]
    if "description" in data: fields["Description"]      = str(data["description"])[:2000]
    if "tags"        in data: fields["Competitive Tags"] = data["tags"]
    try:
        posts_table.update(record_id, fields)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to update post {record_id}: {e}")
        return jsonify({"error": "Failed to update post"}), 400


@app.route("/api/posts/<record_id>", methods=["DELETE"])
@require_auth
def delete_post(record_id):
    record = handle(posts_table.get, record_id)
    if not record:
        return jsonify({"error": "Post not found"}), 404
    uid    = get_request_user_id()
    author = first(record["fields"].get("Author"), "")
    users  = record["fields"].get("Users", [])
    if uid != author and uid not in users:
        return jsonify({"error": "Forbidden"}), 403
    try:
        posts_table.delete(record_id)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to delete post {record_id}: {e}")
        return jsonify({"error": "Failed to delete post"}), 400


@app.route("/api/posts/<record_id>/vote", methods=["POST"])
@require_auth
@limiter.limit("30 per minute")
def vote_post(record_id):
    data   = request.json or {}
    record = handle(posts_table.get, record_id)
    if not record:
        return jsonify({"error": "Post not found"}), 404
    f            = record["fields"]
    up_delta     = int(data.get("upvote_delta",   data.get("vote") == "up"))
    down_delta   = int(data.get("downvote_delta", data.get("vote") == "down"))
    new_upvotes  = max(0, f.get("Upvotes",   0) + up_delta)
    new_downvotes = max(0, f.get("Downvotes", 0) + down_delta)
    posts_table.update(record_id, {"Upvotes": new_upvotes, "Downvotes": new_downvotes})
    return jsonify({"success": True, "upvotes": new_upvotes, "downvotes": new_downvotes})


def _format_post(record):
    f            = record["fields"]
    users_field  = f.get("Users", [])
    author_field = f.get("Author", [])
    user_ids     = users_field if users_field else author_field

    author_names, author_avatars, authors_detail, author_usernames = [], [], [], []

    for uid in user_ids:
        user_record = get_user_cached(uid)
        if user_record:
            uf       = user_record["fields"]
            name     = uf.get("Display Name", "") or uf.get("Username", "")
            username = uf.get("Username", "")
            author_names.append(name)
            author_usernames.append(username)
            # Use resolve_avatar_fields so Default_Avatar_ID is honoured
            author_avatars.extend(resolve_avatar_fields(uf))
            authors_detail.append({"id": uid, "name": name, "username": username})

    tag_ids = f.get("Competitive Tags", f.get("Related Tag", []))

    return {
        "id":              record["id"],
        "author_name":     ", ".join(author_names),
        "author_username": ", ".join(author_usernames),
        "author_avatar":   author_avatars[:2],
        "total_users":     len(user_ids),
        "authors":         authors_detail,
        "title":           f.get("Title", ""),
        "description":     f.get("Description", ""),
        "author":          first(f.get("Author"), ""),
        "family":          first(f.get("Family"), ""),
        "type":            f.get("Type", ""),
        "related_task":    first(f.get("Related Task"), None),
        "upvotes":         f.get("Upvotes", 0),
        "downvotes":       f.get("Downvotes", 0),
        "created_time":    record.get("createdTime", None),
        "photo":           f.get("Attachments", []),
        "status":          f.get("Status", f.get("Select", "Pending")),
        "tags":            tag_ids,
    }


# Comments

@app.route("/api/posts/<post_id>/comments")
def get_comments(post_id):
    records = comments_table.all(formula=f"FIND('{safe_str(post_id)}', ARRAYJOIN({{Post}}))")
    result  = []
    for r in records:
        author_id   = first(r["fields"].get("Author"), "")
        user_record = get_user_cached(author_id) if author_id else None
        author_name, author_avatar = "", []
        if user_record:
            uf            = user_record["fields"]
            author_name   = uf.get("Display Name", "") or uf.get("Username", "")
            # resolve_avatar_fields handles Default_Avatar_ID fallback
            author_avatar = resolve_avatar_fields(uf)

        raw_content      = r["fields"].get("Content", "")
        content          = raw_content
        proposed_tag_ids = r["fields"].get("Competitive Tags", [])
        proposed_tags    = []
        if "\n\n__TAGS__" in raw_content:
            parts   = raw_content.split("\n\n__TAGS__", 1)
            content = parts[0]
            try:
                import json as _json
                meta             = _json.loads(parts[1])
                proposed_tag_ids = meta.get("proposed_tag_ids", proposed_tag_ids)
                proposed_tags    = meta.get("proposed_tags", [])
            except Exception:
                pass

        result.append({
            "id":               r["id"],
            "author":           author_id,
            "author_name":      author_name,
            "author_avatar":    author_avatar,
            "content":          content,
            "proposed_tag_ids": proposed_tag_ids,
            "proposed_tags":    proposed_tags,
            "created_time":     r.get("createdTime", None),
        })
    return jsonify(result)


@app.route("/api/posts/<post_id>/comments", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def create_comment(post_id):
    data    = request.json or {}
    uid     = get_request_user_id()
    content = str(data.get("content", "")).strip()
    if not content:
        return jsonify({"error": "Comment cannot be empty"}), 400

    proposed_tag_ids = data.get("proposed_tag_ids", [])
    proposed_tags    = data.get("proposed_tags", [])

    stored_content = content
    if proposed_tag_ids or proposed_tags:
        import json as _json
        meta = {}
        if proposed_tag_ids: meta["proposed_tag_ids"] = proposed_tag_ids
        if proposed_tags:    meta["proposed_tags"]    = proposed_tags
        stored_content = content + "\n\n__TAGS__" + _json.dumps(meta)

    try:
        new_record = comments_table.create({
            "Content":          stored_content[:2000],
            "Author":           [uid],
            "Post":             [post_id],
            "Competitive Tags": proposed_tag_ids if proposed_tag_ids else [],
        })
        return jsonify({"success": True, "id": new_record["id"]}), 201
    except Exception as e:
        logger.error(f"Failed to create comment: {e}")
        return jsonify({"error": "Failed to create comment"}), 500


@app.route("/api/comments/<comment_id>", methods=["DELETE"])
@require_auth
def delete_comment(comment_id):
    record = handle(comments_table.get, comment_id)
    if not record:
        return jsonify({"error": "Not found"}), 404
    uid    = get_request_user_id()
    author = first(record["fields"].get("Author"), "")
    if uid != author:
        return jsonify({"error": "Forbidden"}), 403
    try:
        comments_table.delete(comment_id)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to delete comment {comment_id}: {e}")
        return jsonify({"error": "Failed to delete comment"}), 400


# Timers

@app.route("/api/timers/<record_id>")
@require_auth
def get_timer(record_id):
    record = handle(timers_table.get, record_id)
    if not record:
        return jsonify({"error": "Timer not found"}), 404
    if not owns_record(record["fields"]):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(_format_timer(record))


@app.route("/api/users/<user_id>/timers")
@require_auth
def get_user_timers(user_id):
    if user_id != get_request_user_id():
        return jsonify({"error": "Forbidden"}), 403
    records = timers_table.all(formula=f"FIND('{safe_str(user_id)}', ARRAYJOIN({{Owner}}))")
    return jsonify([_format_timer(r) for r in records])


@app.route("/api/timers", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def create_timer():
    data   = request.json or {}
    uid    = get_request_user_id()
    fields = {
        "Focus Time":  int(data.get("focus_time",   1500)),
        "Break Timer": int(data.get("break_time",   300)),
        "Break Loops": int(data.get("break_loops",  1)),
        "Owner":       [uid],
    }
    if data.get("task_id"): fields["Task"] = [data["task_id"]]
    if data.get("name"):    fields["Name"] = str(data["name"])[:100]
    try:
        new_record = timers_table.create(fields)
        return jsonify({"success": True, "id": new_record["id"], "timer": _format_timer(new_record)}), 201
    except Exception as e:
        logger.error(f"Failed to create timer: {e}")
        return jsonify({"error": "Failed to create timer"}), 500


@app.route("/api/timers/<record_id>", methods=["PUT"])
@require_auth
def update_timer(record_id):
    record = handle(timers_table.get, record_id)
    if not record:
        return jsonify({"error": "Timer not found"}), 404
    if not owns_record(record["fields"]):
        return jsonify({"error": "Forbidden"}), 403
    data   = request.json or {}
    fields = {}
    if "focus_time"   in data: fields["Focus Time"]  = int(data["focus_time"])
    if "break_time"   in data: fields["Break Timer"] = int(data["break_time"])
    if "break_loops"  in data: fields["Break Loops"] = int(data["break_loops"])
    if "name"         in data: fields["Name"]        = str(data["name"])[:100]
    if not fields:
        return jsonify({"error": "No fields to update"}), 400
    try:
        timers_table.update(record_id, fields)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to update timer {record_id}: {e}")
        return jsonify({"error": "Failed to update timer"}), 400


@app.route("/api/timers/<record_id>", methods=["DELETE"])
@require_auth
def delete_timer(record_id):
    record = handle(timers_table.get, record_id)
    if not record:
        return jsonify({"error": "Timer not found"}), 404
    if not owns_record(record["fields"]):
        return jsonify({"error": "Forbidden"}), 403
    try:
        timers_table.delete(record_id)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to delete timer {record_id}: {e}")
        return jsonify({"error": "Failed to delete timer"}), 400


def _format_timer(record):
    f = record["fields"]
    return {
        "id":          record["id"],
        "name":        f.get("Name", ""),
        "focus_time":  f.get("Focus Time", 1500),
        "break_time":  f.get("Break Timer", 300),
        "break_loops": f.get("Break Loops", 1),
        "task":        first(f.get("Task"), None),
        "owner":       first(f.get("Owner"), ""),
    }


# Competition dashboard

@app.route("/api/users/<user_id>/competition")
@require_auth
def get_competition_dashboard(user_id):
    if user_id != get_request_user_id():
        return jsonify({"error": "Forbidden"}), 403

    user_record = handle(users_table.get, user_id)
    if not user_record:
        return jsonify({"error": "User not found"}), 404

    family_ids = user_record["fields"].get("Families", []) or []
    if not family_ids:
        return jsonify({"families": []})

    family_filter = f"OR({', '.join(f'RECORD_ID()={chr(39)}{safe_str(fid)}{chr(39)}' for fid in family_ids)})"
    member_filter = f"OR({', '.join(f'FIND({chr(39)}{safe_str(fid)}{chr(39)}, ARRAYJOIN({{Family}}))' for fid in family_ids)})"
    post_filter   = member_filter

    import concurrent.futures
    def fetch_families():    return families_table.all(formula=family_filter)
    def fetch_memberships(): return membership_table.all(formula=member_filter)
    def fetch_posts():       return posts_table.all(formula=post_filter)

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        f_families    = pool.submit(fetch_families)
        f_memberships = pool.submit(fetch_memberships)
        f_posts       = pool.submit(fetch_posts)
        all_families    = f_families.result()
        all_memberships = f_memberships.result()
        all_posts       = f_posts.result()

    memberships_by_family = {fid: [] for fid in family_ids}
    for m in all_memberships:
        for fid in (m["fields"].get("Family") or []):
            if fid in memberships_by_family:
                memberships_by_family[fid].append(m)

    posts_by_family = {fid: [] for fid in family_ids}
    for p in all_posts:
        fid = first(p["fields"].get("Family"), None)
        if fid and fid in posts_by_family:
            posts_by_family[fid].append(p)

    family_map = {r["id"]: r for r in all_families}
    result     = []
    for fid in family_ids:
        fam_record = family_map.get(fid)
        if not fam_record:
            continue

        members = []
        for m in memberships_by_family[fid]:
            username = m["fields"].get("User", "")
            uf       = get_user_by_username(username)
            members.append(_format_member_from_fields(m, uf))
        members.sort(key=lambda m: m["points"], reverse=True)

        posts = sorted(
            [_format_post(p) for p in posts_by_family[fid]],
            key=lambda p: p["created_time"] or "",
            reverse=True,
        )[:4]

        ff = fam_record["fields"]
        result.append({
            "id":               fid,
            "name":             ff.get("Name", ""),
            "rank_pts_spacing": ff.get("Rank Pts Spacing", 0),
            "can_invite":       ff.get("Can Invite") or "Everyone",
            "members":          members,
            "posts":            posts,
        })

    return jsonify({"families": result})


# Notifications

@app.route("/api/users/<user_id>/notifications")
@require_auth
def get_notifications(user_id):
    if user_id != get_request_user_id():
        return jsonify({"error": "Forbidden"}), 403
    records = notifs_table.all(formula=f"FIND('{safe_str(user_id)}', ARRAYJOIN({{User}}))")
    return jsonify([
        {
            "id":           r["id"],
            "type":         r["fields"].get("Type", ""),
            "message":      r["fields"].get("Message", ""),
            "is_read":      bool(r["fields"].get("Is Read", False)),
            "related_user": first(r["fields"].get("Related User"), None),
            "related_task": first(r["fields"].get("Related Task"), None),
            "related_post": first(r["fields"].get("Related Post"), None),
            "created_time": r.get("createdTime", None),
        }
        for r in records
    ])


@app.route("/api/notifications/<record_id>/read", methods=["PUT"])
@require_auth
def mark_notification_read(record_id):
    try:
        notifs_table.update(record_id, {"Is Read": True})
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to mark notification {record_id} as read: {e}")
        return jsonify({"error": "Failed to update notification"}), 400


@app.route("/api/notifications/read-all", methods=["PUT"])
@require_auth
def mark_all_notifications_read():
    uid     = get_request_user_id()
    records = notifs_table.all(
        formula=f"AND(FIND('{safe_str(uid)}', ARRAYJOIN({{User}})), NOT({{Is Read}}))"
    )
    try:
        if records:
            updates = [{"id": r["id"], "fields": {"Is Read": True}} for r in records]
            notifs_table.batch_update(updates)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to mark all notifications as read: {e}")
        return jsonify({"error": "Failed to update notifications"}), 400


# Locations

@app.route("/api/locations")
@require_auth
def get_locations():
    records = locations_table.all()
    return jsonify([
        {
            "id":              r["id"],
            "name":            r["fields"].get("Location Name", ""),
            "address":         r["fields"].get("Address", ""),
            "registered_by":   first(r["fields"].get("Registered By"), ""),
        }
        for r in records
    ])


@app.route("/api/locations", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def create_location():
    data = request.json or {}
    uid  = get_request_user_id()
    try:
        new_record = locations_table.create({
            "Location Name":  str(data.get("name", ""))[:100],
            "Address":        str(data.get("address", ""))[:200],
            "Registered By":  [uid],
        })
        return jsonify({"success": True, "id": new_record["id"]}), 201
    except Exception as e:
        logger.error(f"Failed to create location: {e}")
        return jsonify({"error": "Failed to create location"}), 500


@app.route("/api/locations/<location_id>", methods=["DELETE"])
@require_auth
def delete_location(location_id):
    record = handle(locations_table.get, location_id)
    if not record:
        return jsonify({"error": "Not found"}), 404
    uid        = get_request_user_id()
    registered = first(record["fields"].get("Registered By"), "")
    if uid != registered:
        return jsonify({"error": "Forbidden"}), 403
    try:
        locations_table.delete(location_id)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Failed to delete location {location_id}: {e}")
        return jsonify({"error": "Failed to delete location"}), 400


# File uploads

def allowed_file(filename, file_obj):
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False
    file_obj.seek(0)
    kind = imghdr.what(file_obj)
    file_obj.seek(0)
    return kind in ALLOWED_MIME_TYPES


@app.route("/api/upload", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def upload_file_endpoint():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    if not allowed_file(file.filename, file):
        return jsonify({"error": "Invalid file type"}), 400
    ext      = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)
    return jsonify({"success": True, "url": f"{BASE_URL}/uploads/{filename}"}), 201


def _delete_local_upload(attachment_list):
    if not isinstance(attachment_list, list) or not attachment_list:
        return
    url = attachment_list[0].get("url", "")
    if f"{BASE_URL}/uploads/" not in url:
        return
    filename = secure_filename(url.rsplit("/", 1)[-1])
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        logger.warning(f"Could not delete old upload {filepath}: {e}")


# OAuth Helpers

def _oauth_redirect_success(uid, is_new=False):
    url = f"{BASE_URL}/login?oauth_uid={uid}"
    if is_new:
        url += "&oauth_new=1"
    return redirect(url)


def _oauth_redirect_error(msg):
    return redirect(f"{BASE_URL}/login?oauth_error={urllib.parse.quote(msg)}")


def _find_or_create_oauth_user(email, display_name, avatar_url=None):
    if not email:
        return None, False
    safe_email = safe_str(email.strip().lower())
    records    = users_table.all(formula=f"LOWER({{Email}})='{safe_email}'")
    if records:
        return _format_user(records[0]), False

    avatar_num = random.randint(1, AVATAR_COUNT)
    base       = re.sub(r"[^a-z0-9_-]", "_", email.split("@")[0].lower())[:25]
    username   = base
    counter    = 1
    while users_table.all(formula=f"{{Username}}='{safe_str(username)}'"):
        username = f"{base}{counter}"
        counter += 1

    fields = {
        "Username":          username,
        "Display Name":      (display_name or username)[:60],
        "Email":             email.strip().lower(),
        "Password":          generate_password_hash(secrets.token_hex(32)),
        "Streak":            0,
        "Private":           False,
        "Default_Avatar_ID": avatar_num,
    }
    if avatar_url:
        fields["Profile_Picture"] = [{"url": avatar_url}]

    try:
        new_record = users_table.create(fields)
        return _format_user(new_record), True
    except Exception as e:
        logger.error(f"Failed to create OAuth user ({email}): {e}")
        return None, False
    

# Google OAuth

@app.route("/api/auth/google")
def auth_google():
    creds = get_oauth_creds("google")
    if not creds:
        return "Google login is not configured.", 503
    state = secrets.token_urlsafe(16)
    session["oauth_state_google"] = state
    params = {
        "client_id":     creds["client_id"],
        "redirect_uri":  f"{BASE_URL}/api/auth/google/callback",
        "response_type": "code",
        "scope":         "openid email profile",
        "state":         state,
        "access_type":   "offline",
        "prompt":        "select_account",
    }
    return redirect("https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params))


@app.route("/api/auth/google/callback")
def auth_google_callback():
    code  = request.args.get("code")
    state = request.args.get("state")
    if not code or state != session.pop("oauth_state_google", None):
        return _oauth_redirect_error("Google login was cancelled or failed.")
    creds = get_oauth_creds("google")
    if not creds:
        return _oauth_redirect_error("Google login is not configured.")
    try:
        token_resp = http_requests.post("https://oauth2.googleapis.com/token", data={
            "code":          code,
            "client_id":     creds["client_id"],
            "client_secret": creds["client_secret"],
            "redirect_uri":  f"{BASE_URL}/api/auth/google/callback",
            "grant_type":    "authorization_code",
        }, timeout=10)
        token_resp.raise_for_status()
        access_token = token_resp.json().get("access_token")
        info = http_requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        ).json()
        user, is_new = _find_or_create_oauth_user(
            email=info.get("email"),
            display_name=info.get("name"),
            avatar_url=info.get("picture"),
        )
        if not user:
            return _oauth_redirect_error("Could not retrieve your Google email address.")
        session["user_id"] = user["id"]
        return _oauth_redirect_success(user["id"], is_new=is_new)
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        return _oauth_redirect_error("Google login failed. Please try again.")


# Facebook OAuth Currently Broken

@app.route("/api/auth/facebook")
def auth_facebook():
    creds = get_oauth_creds("facebook")
    if not creds:
        return "Facebook login is not configured.", 503
    state = secrets.token_urlsafe(16)
    session["oauth_state_facebook"] = state
    params = {
        "client_id":    creds["client_id"],
        "redirect_uri": f"{BASE_URL}/api/auth/facebook/callback",
        "scope":        "email,public_profile",
        "state":        state,
    }
    return redirect("https://www.facebook.com/v19.0/dialog/oauth?" + urllib.parse.urlencode(params))


@app.route("/api/auth/facebook/callback")
def auth_facebook_callback():
    code  = request.args.get("code")
    state = request.args.get("state")
    if not code or state != session.pop("oauth_state_facebook", None):
        return _oauth_redirect_error("Facebook login was cancelled or failed.")
    creds = get_oauth_creds("facebook")
    if not creds:
        return _oauth_redirect_error("Facebook login is not configured.")
    try:
        token_resp = http_requests.get("https://graph.facebook.com/v19.0/oauth/access_token", params={
            "client_id":     creds["client_id"],
            "client_secret": creds["client_secret"],
            "redirect_uri":  f"{BASE_URL}/api/auth/facebook/callback",
            "code":          code,
        }, timeout=10)
        token_resp.raise_for_status()
        access_token = token_resp.json().get("access_token")
        info = http_requests.get("https://graph.facebook.com/me", params={
            "fields":       "id,name,email,picture.type(large)",
            "access_token": access_token,
        }, timeout=10).json()
        avatar_url = info.get("picture", {}).get("data", {}).get("url")
        user, is_new = _find_or_create_oauth_user(
            email=info.get("email"),
            display_name=info.get("name"),
            avatar_url=avatar_url,
        )
        if not user:
            return _oauth_redirect_error("Facebook did not share your email. Please allow email access and try again.")
        session["user_id"] = user["id"]
        return _oauth_redirect_success(user["id"], is_new=is_new)
    except Exception as e:
        logger.error(f"Facebook OAuth error: {e}")
        return _oauth_redirect_error("Facebook login failed. Please try again.")


# X (Twitter) OAuth

@app.route("/api/auth/x")
def auth_x():
    creds = get_oauth_creds("x")
    if not creds:
        return "X login is not configured.", 503
    verifier  = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state     = secrets.token_urlsafe(16)
    _pkce_store[state] = verifier
    params = {
        "response_type":         "code",
        "client_id":             creds["client_id"],
        "redirect_uri":          f"{BASE_URL}/api/auth/x/callback",
        "scope":                 "tweet.read users.read offline.access",
        "state":                 state,
        "code_challenge":        challenge,
        "code_challenge_method": "S256",
    }
    return redirect("https://twitter.com/i/oauth2/authorize?" + urllib.parse.urlencode(params))


@app.route("/api/auth/x/callback")
def auth_x_callback():
    code     = request.args.get("code")
    state    = request.args.get("state")
    verifier = _pkce_store.pop(state, None)
    if not code or not verifier:
        return _oauth_redirect_error("X login was cancelled or expired.")
    creds = get_oauth_creds("x")
    if not creds:
        return _oauth_redirect_error("X login is not configured.")
    try:
        token_resp = http_requests.post(
            "https://api.twitter.com/2/oauth2/token",
            data={
                "code":          code,
                "grant_type":    "authorization_code",
                "client_id":     creds["client_id"],
                "redirect_uri":  f"{BASE_URL}/api/auth/x/callback",
                "code_verifier": verifier,
            },
            auth=(creds["client_id"], creds["client_secret"]),
            timeout=10,
        )
        token_resp.raise_for_status()
        access_token = token_resp.json().get("access_token")
        info = http_requests.get(
            "https://api.twitter.com/2/users/me",
            params={"user.fields": "name,profile_image_url"},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        ).json().get("data", {})
        twitter_id      = info.get("id")
        synthetic_email = f"x_{twitter_id}@x.oauth.tasker"
        avatar_url      = info.get("profile_image_url", "").replace("_normal", "_400x400")
        user, is_new = _find_or_create_oauth_user(
            email=synthetic_email,
            display_name=info.get("name"),
            avatar_url=avatar_url,
        )
        if not user:
            return _oauth_redirect_error("Could not create account from your X profile.")
        session["user_id"] = user["id"]
        return _oauth_redirect_success(user["id"], is_new=is_new)
    except Exception as e:
        logger.error(f"X OAuth error: {e}")
        return _oauth_redirect_error("X login failed. Please try again.")


# Discord OAuth

@app.route("/api/auth/discord")
def auth_discord():
    creds = get_oauth_creds("discord")
    if not creds:
        return "Discord login is not configured.", 503
    state = secrets.token_urlsafe(16)
    session["oauth_state_discord"] = state
    params = {
        "client_id":     creds["client_id"],
        "redirect_uri":  f"{BASE_URL}/api/auth/discord/callback",
        "response_type": "code",
        "scope":         "identify email",
        "state":         state,
    }
    return redirect("https://discord.com/api/oauth2/authorize?" + urllib.parse.urlencode(params))


@app.route("/api/auth/discord/callback")
def auth_discord_callback():
    code  = request.args.get("code")
    state = request.args.get("state")
    if not code or state != session.pop("oauth_state_discord", None):
        return _oauth_redirect_error("Discord login was cancelled or failed.")
    creds = get_oauth_creds("discord")
    if not creds:
        return _oauth_redirect_error("Discord login is not configured.")
    try:
        token_resp = http_requests.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id":     creds["client_id"],
                "client_secret": creds["client_secret"],
                "grant_type":    "authorization_code",
                "code":          code,
                "redirect_uri":  f"{BASE_URL}/api/auth/discord/callback",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
        token_resp.raise_for_status()
        access_token = token_resp.json().get("access_token")
        info         = http_requests.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        ).json()
        discord_id  = info.get("id")
        avatar_hash = info.get("avatar")
        avatar_url  = (
            f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar_hash}.png?size=256"
            if avatar_hash else None
        )
        user, is_new = _find_or_create_oauth_user(
            email=info.get("email"),
            display_name=info.get("global_name") or info.get("username"),
            avatar_url=avatar_url,
        )
        if not user:
            return _oauth_redirect_error("Discord did not share your email. Please allow email access and try again.")
        session["user_id"] = user["id"]
        return _oauth_redirect_success(user["id"], is_new=is_new)
    except Exception as e:
        logger.error(f"Discord OAuth error: {e}")
        return _oauth_redirect_error("Discord login failed. Please try again.")


# Health Check

@app.route("/health")
@limiter.exempt
def health():
    return jsonify({
        "status":    "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version":   "1.3.0",
    }), 200


# React catch-all (must be last)

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    if path.startswith("api/") or path.startswith("uploads/") or path.startswith("static/"):
        return jsonify({"error": "Route not found"}), 404
    return send_from_directory(app.static_folder, "index.html")


# Error handlers

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Rate limit exceeded. Try again later."}), 429

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal error: {e}", exc_info=True)
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


if __name__ == "__main__":
    port = int(os.getenv("PORT", PORT))
    logger.info(f"Starting Tasker backend on 0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, threaded=True)