import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {
    "User-Agent": "PathToPlan/1.0 (travel-planning-demo)"
}

def search_location(query, limit=6):
    response = requests.get(
        NOMINATIM_URL,
        params={"q": query, "format": "jsonv2", "limit": limit, "addressdetails": 1},
        headers=HEADERS,
        timeout=12
    )
    response.raise_for_status()
    data = response.json()
    return [
        {
            "name": item.get("display_name", "Information not available."),
            "lat": float(item["lat"]),
            "lon": float(item["lon"]),
            "type": item.get("type", "place"),
            "osm_id": item.get("osm_id")
        }
        for item in data
        if "lat" in item and "lon" in item
    ]
