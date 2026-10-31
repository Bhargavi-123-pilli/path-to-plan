import requests

# The public OSRM demo server provides the driving profile only. Foot and
# bicycle profiles require a separately hosted/configured routing service.
OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
SUPPORTED_MODES = {"driving"}

def get_route(start, end, mode="driving"):
    if mode not in SUPPORTED_MODES:
        raise ValueError(
            "Walking and cycling routes are not available through the public OSRM demo server. "
            "Please select Driving, or configure a routing provider with foot/bicycle profiles."
        )

    for point in (start, end):
        lat, lon = float(point["lat"]), float(point["lon"])
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("Coordinates are outside the valid latitude/longitude range.")

    url = f"{OSRM_URL}/{float(start['lon'])},{float(start['lat'])};{float(end['lon'])},{float(end['lat'])}"
    response = requests.get(
        url,
        params={"overview": "full", "geometries": "geojson", "steps": "false"},
        timeout=20,
        headers={"User-Agent": "PathToPlan/1.0"},
    )
    response.raise_for_status()
    data = response.json()

    if data.get("code") != "Ok" or not data.get("routes"):
        raise RuntimeError("No driving route found for the selected locations.")

    route = data["routes"][0]
    return {
        "distance_km": round(route["distance"] / 1000, 2),
        "duration_minutes": round(route["duration"] / 60, 1),
        "geometry": route["geometry"],
    }
