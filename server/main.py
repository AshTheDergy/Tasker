import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pyairtable import Api
from dotenv import load_dotenv

load_dotenv()

AIRTABLE_TOKEN = os.getenv("AIRTABLE_TOKEN")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID")

api = Api(AIRTABLE_TOKEN)
tasks_table = api.table(AIRTABLE_BASE_ID, 'Tasks')
compUsers_table = api.table(AIRTABLE_BASE_ID, 'CompUsers')

app = Flask(__name__, static_folder='dist')
CORS(app)

# Task related stuff

@app.route("/api/tasks")
def tasks_endpoint():
    all_records = tasks_table.all()
    tasks = []
    for record in all_records:
        tasks.append({
            "id": record['id'],
            "Name": record['fields'].get("Name", ""),
            "Description": record['fields'].get("Description", ""),
            "Category": record['fields'].get("Category", ""),
            "Status": record['fields'].get("Status", "Incomplete")
        })
    return jsonify(tasks)

@app.route("/api/tasks", methods=["POST"])
def create_task():
    data = request.json
    new_record = tasks_table.create({
        "Name": data.get("Name", ""),
        "Description": data.get("Description", ""),
        "Category": data.get("Category") or [],
        "Status": data.get("Status", "Incomplete"),
        "Time": data.get("Time", "")
    })
    return jsonify({"success": True, "record": new_record}), 201

@app.route("/api/tasks/<record_id>", methods=["PUT"])
def update_task(record_id):
    data = request.json

    try:
        updated_record = tasks_table.update(record_id, {
            "Status": data.get("Status")
        })
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# Competitive stuff

@app.route("/api/competitive_users")
def compUsers_endpoint():
    all_records = compUsers_table.all()
    compUsers = []
    for record in all_records:
        compUsers.append({
            "id": record['id'],
            "User_id": record['fields'].get('User', "")[0],
            "Assigned_Comp": record['fields'].get('Competition', ""),
            "points": record['fields'].get('Points', "0"),
            "username": record['fields'].get('Lookup_Name', [""])[0],
            "avatar": record['fields'].get('Lookup_PFP', [""])[0],
        })
    return jsonify(compUsers)











@app.route("/", defaults={'path': ''})
@app.route("/<path:path>")
def serve_react(path):
    if path.startswith("api/"):
        return jsonify({"error": "API route not found"}), 404
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5173)
