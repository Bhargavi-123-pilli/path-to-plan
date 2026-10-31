import math
import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

CATEGORY_QUERIES = {
    "hospitals": [
        ('node["amenity"="hospital"]'),
        ('way["amenity"="hospital"]'),
        ('relation["amenity"="hospital"]')
    ],
    "bus": [
        ('node["highway"="bus_stop"]'),
        ('node["amenity"="bus_station"]'),
        ('way["amenity"="bus_station"]')
    ],
    "railway": [
        ('node["railway"="station"]'),
        ('way["railway"="station"]'),
        ('relation["railway"="station"]')
    ],
    "airports": [
        ('node["aeroway"="aerodrome"]'),
        ('way["aeroway"="aerodrome"]'),
        ('relation["aeroway"="aerodrome"]')
    ],
    "seaports": [
        ('node["harbour"="yes"]'),
        ('way["harbour"="yes"]'),
        ('relation["harbour"="yes"]'),
        ('node["industrial"="port"]'),
        ('way["industrial"="port"]'),
        ('relation["industrial"="port"]')
    ],
    "hotels": [
        ('node["tourism"="hotel"]'),
        ('way["tourism"="hotel"]'),
        ('relation["tourism"="hotel"]')
    ],
    "restaurants": [
        ('node["amenity"="restaurant"]'),
        ('way["amenity"="restaurant"]'),
        ('relation["amenity"="restaurant"]')
    ],
}

CATEGORY_LABELS = {
    "hospitals": "Hospital",
    "bus": "Bus Station",
    "railway": "Railway Station",
    "airports": "Airport",
    "seaports": "Seaport",
    "hotels": "Hotel",
    "restaurants": "Restaurant",
}

def _distance_km(lat1, lon1, lat2, lon2):
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl/2)**2
    return 2 * r * math.asin(math.sqrt(a))

def _element_point(element):
    if element.get("type") == "node":
        return element.get("lat"), element.get("lon")
    center = element.get("center") or {}
    return center.get("lat"), center.get("lon")

def _build_query(lat, lon, radius_m, category):
    selectors = CATEGORY_QUERIES[category]
    body = "\n".join(
        f"{selector}(around:{radius_m},{lat},{lon});" for selector in selectors
    )
    return f"[out:json][timeout:25];({body});out center tags;"

def _query_category(lat, lon, radius_m, category):
    response = requests.post(
        OVERPASS_URL,
        data=_build_query(lat, lon, radius_m, category),
        headers={"User-Agent": "PathToPlan/1.0"},
        timeout=35
    )
    response.raise_for_status()
    return response.json().get("elements", [])

def find_nearby_places(lat, lon, category="all", radius_km=5):
    categories = list(CATEGORY_QUERIES) if category == "all" else [category]
    if category not in CATEGORY_QUERIES and category != "all":
        raise ValueError("Unknown nearby-place category.")

    results = []
    for cat in categories:
        try:
            elements = _query_category(lat, lon, radius_km * 1000, cat)
        except requests.RequestException:
            # Continue other categories so one temporary Overpass failure does not
            # make the entire request unusable.
            continue

        for element in elements:
            plat, plon = _element_point(element)
            if plat is None or plon is None:
                continue
            tags = element.get("tags", {})
            name = tags.get("name") or "Information not available."
            address_parts = [
                tags.get("addr:housenumber"),
                tags.get("addr:street"),
                tags.get("addr:city"),
                tags.get("addr:state"),
            ]
            address = ", ".join(p for p in address_parts if p) or "Information not available."
            phone = tags.get("phone") or tags.get("contact:phone")
            cuisine = tags.get("cuisine") if cat == "restaurants" else None
            results.append({
                "id": f"{element.get('type','x')}-{element.get('id','x')}",
                "name": name,
                "category": CATEGORY_LABELS[cat],
                "category_key": cat,
                "lat": plat,
                "lon": plon,
                "distance_km": round(_distance_km(lat, lon, plat, plon), 2),
                "address": address,
                "phone": phone,
                "cuisine": cuisine,
            })

    results.sort(key=lambda x: x["distance_km"])
    unique = []
    seen = set()
    for item in results:
        key = (item["name"].lower(), round(item["lat"], 5), round(item["lon"], 5))
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique
