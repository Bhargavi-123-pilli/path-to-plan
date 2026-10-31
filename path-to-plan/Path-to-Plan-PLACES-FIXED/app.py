from flask import Flask, render_template, request, jsonify
from database.db import init_db, create_trip, get_trip, delete_trip
from services.geocoding import search_location
from services.routing import get_route
from services.nearby_places import find_nearby_places

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

init_db()

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/plan-trip")
def plan_trip():
    return render_template("plan_trip.html")

@app.get("/route")
def route_page():
    return render_template("route.html")

@app.get("/nearby")
def nearby_page():
    return render_template("nearby_places.html")

@app.get("/my-trip")
def my_trip():
    trip_id = request.args.get("id", type=int)
    trip = get_trip(trip_id) if trip_id else None
    return render_template("my_trip.html", trip=trip)

@app.get("/about")
def about():
    return render_template("about.html")

@app.get("/search-location")
def search_location_api():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"success": False, "error": "Please enter a location."}), 400
    try:
        results = search_location(query)
        return jsonify({"success": True, "results": results})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 502

@app.get("/search-destination")
def search_destination_api():
    return search_location_api()

@app.post("/get-directions")
def directions_api():
    data = request.get_json(silent=True) or {}
    try:
        start = {"lat": float(data["start_lat"]), "lon": float(data["start_lon"])}
        end = {"lat": float(data["end_lat"]), "lon": float(data["end_lon"])}
        mode = data.get("mode", "driving")
        route = get_route(start, end, mode)
        return jsonify({"success": True, "route": route})
    except KeyError:
        return jsonify({"success": False, "error": "Starting location and destination are required."}), 400
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc) or "Invalid coordinates."}), 400
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 502

@app.get("/nearby-places")
def nearby_api():
    try:
        lat = float(request.args["lat"])
        lon = float(request.args["lon"])
        category = request.args.get("category", "all")
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return jsonify({"success": False, "error": "Coordinates are outside the valid latitude/longitude range."}), 400
        radius = int(request.args.get("radius", "5"))
        if radius not in (1, 2, 5, 10):
            radius = 5
        results = find_nearby_places(lat, lon, category, radius)
        return jsonify({"success": True, "results": results, "category": category, "radius_km": radius})
    except (KeyError, ValueError):
        return jsonify({"success": False, "error": "Valid latitude and longitude are required."}), 400
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 502

@app.post("/create-trip")
def create_trip_api():
    data = request.get_json(silent=True) or {}
    try:
        trip_id = create_trip(data)
        return jsonify({"success": True, "trip_id": trip_id})
    except (KeyError, ValueError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

@app.get("/view-trip")
def view_trip_api():
    trip_id = request.args.get("id", type=int)
    trip = get_trip(trip_id) if trip_id else None
    if not trip:
        return jsonify({"success": False, "error": "Trip not found."}), 404
    return jsonify({"success": True, "trip": trip})

@app.delete("/delete-trip")
def delete_trip_api():
    trip_id = request.args.get("id", type=int)
    if not trip_id:
        return jsonify({"success": False, "error": "Trip ID is required."}), 400
    delete_trip(trip_id)
    return jsonify({"success": True})

@app.errorhandler(404)
def not_found(_):
    if request.path.startswith("/search-") or request.path.startswith("/nearby") or request.path.startswith("/get-"):
        return jsonify({"success": False, "error": "Resource not found."}), 404
    return render_template("404.html"), 404

if __name__ == "__main__":
    app.run(debug=True)
