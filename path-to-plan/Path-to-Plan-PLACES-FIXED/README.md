# Path to Plan – Smart Travel Planning & Nearby Places Assistant

## Project objective
Path to Plan is a full-stack travel planning assistant. It searches starting locations and destinations, calculates routes, discovers nearby facilities, and saves a travel plan in SQLite.

## Features
- Starting-location and destination search
- Browser "Use My Current Location" with permission handling
- Driving route calculation through the configured public OSRM demo service
- Distance and estimated travel time
- Interactive Leaflet + OpenStreetMap map
- Nearby hospitals, bus stations, railway stations, airports, seaports, hotels and restaurants
- 1 km, 2 km, 5 km and 10 km radius
- Nearest-first sorting
- Category filtering
- Directions to nearby places
- SQLite trip storage
- Multiple destination database structure for future itinerary expansion
- Friendly error handling and no fabricated place information

## Technology
- Frontend: HTML5, CSS3, JavaScript
- Backend: Python + Flask
- Database: SQLite
- Maps: Leaflet + OpenStreetMap
- Geocoding: Nominatim
- Routing: OSRM
- Nearby places: OpenStreetMap Overpass API

## Workflow
Starting Location → Destination → Route → Nearby Facilities → Complete Travel Plan

## Project structure
```text
Path-to-Plan/
├── app.py
├── requirements.txt
├── README.md
├── database/
│   ├── __init__.py
│   └── db.py
├── templates/
│   ├── base.html
│   ├── index.html
│   ├── plan_trip.html
│   ├── route.html
│   ├── nearby_places.html
│   ├── my_trip.html
│   ├── about.html
│   └── 404.html
├── static/
│   ├── css/style.css
│   └── js/
│       ├── script.js
│       ├── plan.js
│       └── nearby.js
└── services/
    ├── __init__.py
    ├── geocoding.py
    ├── routing.py
    └── nearby_places.py
```

## Database design
### trips
id, start_location, start_latitude, start_longitude, destination, destination_latitude, destination_longitude, distance, estimated_time, created_at

### trip_destinations
id, trip_id, destination_name, latitude, longitude, visit_order

Nearby-place records are retrieved dynamically and are not permanently stored. Saved trip route geometry is stored as JSON so the saved-trip page can redraw the actual calculated route. The SQLite database is created automatically on first run and is intentionally excluded from Git.

## Installation
1. Install Python 3.10+.
2. Open this folder in VS Code.
3. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
4. Activate it on Windows:
   ```bash
   venv\Scripts\activate
   ```
5. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
6. Start the application:
   ```bash
   python app.py
   ```
7. Open:
   `http://127.0.0.1:5000`

## External services
The application uses public OpenStreetMap ecosystem services. No API keys are hard-coded.
- Nominatim: location search/geocoding
- OSRM: route calculation
- Overpass API: nearby OpenStreetMap features
- Leaflet: interactive map rendering

Public services have usage policies and availability limits. For production-scale deployment, use an appropriate hosted provider or self-host infrastructure and follow each service's policy.

## Data accuracy
The application does not fabricate hospital names, hotels, restaurants, stations, ports, addresses, phone numbers, ratings, prices or availability. Missing fields are shown as "Information not available."

## Limitations
- The public OSRM demo endpoint used by this project supports driving only. Walking/cycling buttons explain this limitation; configure a separate routing provider with foot/bicycle profiles to enable them.
- Public map APIs can be rate-limited or temporarily unavailable.
- OpenStreetMap coverage varies by area.
- Railway/flight schedules are intentionally not provided.
- "Get Directions" opens a map directions page; route calculation inside Path to Plan is used for the main journey.
- Multi-destination storage is included; a full optimized multi-stop route can be added later.

## Screenshots
Add screenshots here after running the project locally.

## Future enhancements
- Full multi-stop itinerary route optimization
- User accounts
- Offline caching
- Public transport schedules through licensed/reliable APIs
- Weather integration
- Trip sharing/export to PDF
- Saved nearby-place favorites
- Production-grade API caching and rate-limit protection

## Interview preparation

### 2-minute explanation
"Path to Plan is a full-stack travel planning application built using Python Flask, SQLite, HTML, CSS and JavaScript. The user searches for a starting location and destination. Nominatim converts the text into coordinates, and OSRM calculates a route with distance and estimated time. Leaflet displays the interactive map using OpenStreetMap tiles. The application also uses the Overpass API to find real nearby hospitals, bus stations, railway stations, airports, seaports, hotels and restaurants around both the starting point and destination. Results are sorted by distance and shown with map locations and available details. The selected trip can be stored in SQLite. I separated geocoding, routing and nearby-place logic into service modules so the external providers can be replaced later."

### Module explanation
- `app.py`: Flask routes and API orchestration.
- `geocoding.py`: Nominatim location search.
- `routing.py`: OSRM route calculation.
- `nearby_places.py`: Overpass category queries and distance sorting.
- `db.py`: SQLite schema and trip persistence.
- Templates/JS/CSS: responsive UI and map interaction.

### Frontend-backend communication
JavaScript uses `fetch()` to call Flask JSON endpoints. Flask validates input, calls a service module, and returns JSON. The browser renders results and markers.

### Database interaction
Flask calls `db.py`, which opens SQLite connections, inserts trips and retrieves/deletes saved trips. Nearby data remains dynamic.

### Geocoding
A text location is sent to Nominatim, which returns coordinates and a display name.

### Route calculation
Coordinates are sent to OSRM. OSRM returns route geometry, distance and duration.

### Nearby-place search
The backend builds category-based Overpass queries around the selected latitude/longitude and radius, then sorts returned places by calculated distance.

### Why OpenStreetMap/Leaflet?
They are open-source/open-data friendly and avoid hard-coded API keys for this project. Leaflet is lightweight and works well with OpenStreetMap tiles.

### Challenges and solutions
1. API failures → timeouts, error messages and graceful fallback.
2. Location permission denied → manual search remains available.
3. Missing OSM fields → show "Information not available."
4. Different OSM element types → handle node/way/relation centers.
5. Search radius → user-selectable 1/2/5/10 km.
6. UI responsiveness → CSS grid and mobile breakpoints.

### 20 technical interview questions
1. Why Flask? — It is lightweight and suitable for a modular Python web application.
2. Why SQLite? — It is simple, file-based and sufficient for this project.
3. What is an API? — A defined interface that lets software systems exchange data.
4. What is geocoding? — Converting a place name/address into coordinates.
5. What is reverse geocoding? — Converting coordinates into a readable place/address.
6. What is Leaflet? — A JavaScript library for interactive maps.
7. What is OpenStreetMap? — An open geographic database and map-data ecosystem.
8. What is Nominatim? — An OpenStreetMap search/geocoding service.
9. What is OSRM? — An open routing engine used here for route geometry, distance and duration.
10. What is Overpass API? — A query service for retrieving selected OpenStreetMap objects.
11. Why separate services? — Separation of concerns makes code easier to test and replace.
12. How does the browser call Flask? — With HTTP requests using JavaScript `fetch()`.
13. How is route distance obtained? — OSRM returns distance in meters; the backend converts it to km.
14. How is travel time obtained? — OSRM returns duration in seconds; the backend converts it to minutes.
15. How are nearby results sorted? — Haversine distance is calculated and results are sorted ascending.
16. How is fake data avoided? — Place details are read from the external map dataset; missing fields are not guessed.
17. What happens if geolocation is denied? — The user can manually search a location.
18. Why no hard-coded API keys? — The selected public services do not require keys for this demo architecture.
19. How is SQL data protected? — SQLite parameterized queries are used instead of string-concatenated SQL.
20. What is a limitation? — Public services may be rate-limited and OSM coverage is not uniform.

### 10 project follow-up questions
1. How would you implement full multi-destination routing?
2. How would you add authentication?
3. How would you cache repeated nearby searches?
4. How would you handle API rate limits?
5. How would you deploy Flask in production?
6. How would you add weather?
7. How would you add public transport schedules?
8. How would you export a trip as PDF?
9. How would you test the service modules?
10. How would you scale SQLite to many users?

### Simple answers
- Multi-destination: use OSRM table/route capabilities or another routing provider and optimize stop order.
- Authentication: add a users table, password hashing and session-based login.
- Caching: cache geocoding and nearby responses with a TTL.
- Rate limits: throttle requests, cache results and use a production provider.
- Deployment: use Gunicorn behind a reverse proxy and HTTPS.
- Weather: integrate a reliable weather API behind a separate service module.
- Transport: integrate a reliable licensed/public transport data source.
- PDF: render a server-side travel summary with a PDF library.
- Testing: unit-test service parsing, validation and database functions.
- Scaling: migrate persistence to PostgreSQL and introduce caching.

## Important disclaimer
Nearby place information is provided for reference. Please verify availability and contact details before relying on it.


## Map troubleshooting
If the map appears blank or partially loaded:
1. Make sure the computer has internet access.
2. Open the application through Flask (`http://127.0.0.1:5000`), not by double-clicking an HTML file.
3. Refresh the page after starting Flask.
4. OpenStreetMap tiles are loaded from the public OpenStreetMap tile service, so temporary service/network restrictions can affect map loading.


## Nearby places behavior
- Selecting a start or destination location loads all supported nearby categories within the chosen radius.
- Results are grouped into hospitals, bus stations, railway stations, airports, seaports, hotels, and restaurants.
- Clicking a place name focuses the Leaflet map on that exact OpenStreetMap coordinate and opens its marker popup.
- Nearby data is retrieved dynamically from OpenStreetMap/Overpass; names are not hard-coded.
#   p a t h - t o - p l a n 
 
 