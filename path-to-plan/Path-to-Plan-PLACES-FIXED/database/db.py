import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).resolve().parent / "travel.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS trips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_location TEXT NOT NULL,
                start_latitude REAL NOT NULL,
                start_longitude REAL NOT NULL,
                destination TEXT NOT NULL,
                destination_latitude REAL NOT NULL,
                destination_longitude REAL NOT NULL,
                distance REAL,
                estimated_time REAL,
                route_geometry TEXT,
                created_at TEXT NOT NULL
            )
        """)
        # Backward-compatible migration for databases created by earlier versions.
        columns = {row[1] for row in conn.execute("PRAGMA table_info(trips)").fetchall()}
        if "route_geometry" not in columns:
            conn.execute("ALTER TABLE trips ADD COLUMN route_geometry TEXT")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS trip_destinations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trip_id INTEGER NOT NULL,
                destination_name TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                visit_order INTEGER NOT NULL,
                FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
            )
        """)

def create_trip(data):
    required = [
        "start_location", "start_latitude", "start_longitude",
        "destination", "destination_latitude", "destination_longitude"
    ]
    for key in required:
        if key not in data or str(data[key]).strip() == "":
            raise ValueError(f"{key} is required.")

    with get_connection() as conn:
        cur = conn.execute("""
            INSERT INTO trips (
                start_location, start_latitude, start_longitude,
                destination, destination_latitude, destination_longitude,
                distance, estimated_time, route_geometry, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["start_location"], float(data["start_latitude"]), float(data["start_longitude"]),
            data["destination"], float(data["destination_latitude"]), float(data["destination_longitude"]),
            data.get("distance"), data.get("estimated_time"),
            json.dumps(data.get("route_geometry")) if data.get("route_geometry") else None,
            datetime.now().isoformat(timespec="seconds")
        ))
        trip_id = cur.lastrowid

        destinations = data.get("destinations") or []
        for order, item in enumerate(destinations, start=1):
            conn.execute("""
                INSERT INTO trip_destinations
                (trip_id, destination_name, latitude, longitude, visit_order)
                VALUES (?, ?, ?, ?, ?)
            """, (
                trip_id, item["name"], float(item["lat"]), float(item["lon"]), order
            ))
        return trip_id

def get_trip(trip_id):
    if not trip_id:
        return None
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        if not row:
            return None
        trip = dict(row)
        if trip.get("route_geometry"):
            try:
                trip["route_geometry"] = json.loads(trip["route_geometry"])
            except (TypeError, json.JSONDecodeError):
                trip["route_geometry"] = None
        rows = conn.execute("""
            SELECT * FROM trip_destinations
            WHERE trip_id = ? ORDER BY visit_order
        """, (trip_id,)).fetchall()
        trip["destinations"] = [dict(r) for r in rows]
        return trip

def delete_trip(trip_id):
    with get_connection() as conn:
        conn.execute("DELETE FROM trip_destinations WHERE trip_id = ?", (trip_id,))
        conn.execute("DELETE FROM trips WHERE id = ?", (trip_id,))
