let map, startPoint=null, destPoint=null, routeLayer=null, markersLayer;
let travelMode = "driving";

document.addEventListener("DOMContentLoaded", () => {
  map = L.map("map").setView([16.9891, 82.2475], 8);
  const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  }).addTo(map);

  tiles.on("tileerror", () => {
    showMessage("plannerMessage", "Map tiles are taking too long to load. Check your internet connection and refresh the page.");
  });

  markersLayer = L.layerGroup().addTo(map);
  setTimeout(() => map.invalidateSize(), 250);
  document.querySelectorAll(".mode").forEach(btn => btn.addEventListener("click", () => {
    if (btn.dataset.mode !== "driving") {
      showMessage("plannerMessage", "The configured public OSRM service currently supports driving routes only. Walking/cycling need a separate routing provider.");
      return;
    }
    document.querySelectorAll(".mode").forEach(b => b.classList.remove("active"));
    btn.classList.add("active"); travelMode = btn.dataset.mode;
    showMessage("plannerMessage", "");
  }));
});

async function searchPlace(type) {
  const input = document.getElementById(type === "start" ? "startSearch" : "destSearch");
  const resultsEl = document.getElementById(type === "start" ? "startResults" : "destResults");
  resultsEl.innerHTML = "<div class='result-item'>Searching...</div>";
  try {
    const r = await fetch("/search-location?q=" + encodeURIComponent(input.value.trim()));
    const d = await r.json();
    if (!d.success) throw new Error(d.error);
    if (!d.results.length) {
      resultsEl.innerHTML = "<div class='result-item'>No locations found. Try a more specific search.</div>"; return;
    }
    resultsEl.innerHTML = d.results.map((x,i) =>
      `<div class="result-item" onclick='selectPlace(${JSON.stringify(type)}, ${i})'>${escapeHtml(x.name)}</div>`
    ).join("");
    resultsEl._data = d.results;
  } catch(e) { resultsEl.innerHTML = `<div class="result-item">${escapeHtml(e.message)}</div>`; }
}

function selectPlace(type, index) {
  const resultsEl = document.getElementById(type === "start" ? "startResults" : "destResults");
  const x = resultsEl._data[index];
  if (type === "start") startPoint = x; else destPoint = x;
  document.getElementById(type === "start" ? "startSelected" : "destSelected").textContent =
    "Selected: " + x.name;
  resultsEl.innerHTML = "";
  addLocationMarker(type, x);

  // As soon as a location is selected, show every supported nearby category
  // within the selected radius. The same data is reused after route creation.
  const containerId = type === "start" ? "startNearby" : "destNearby";
  loadMiniNearby(containerId, x, true);
}

function addLocationMarker(type, x) {
  const colorName = type === "start" ? "Starting location" : "Destination";
  const marker = L.marker([x.lat,x.lon]).bindPopup(`<b>${escapeHtml(colorName)}</b><br>${escapeHtml(x.name)}`);
  marker.addTo(markersLayer).openPopup();
  map.setView([x.lat,x.lon], 11);
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showMessage("plannerMessage", "Browser geolocation is not supported. Please search manually."); return;
  }
  showMessage("plannerMessage", "Requesting your location...");
  navigator.geolocation.getCurrentPosition(async pos => {
    startPoint = {name:"My Current Location", lat:pos.coords.latitude, lon:pos.coords.longitude};
    document.getElementById("startSelected").textContent = "Selected: My Current Location";
    addLocationMarker("start", startPoint);
    showMessage("plannerMessage", "");
  }, () => showMessage("plannerMessage", "Location permission was denied. Please search your starting location manually."));
}

async function calculatePlan() {
  if (!startPoint || !destPoint) {
    showMessage("plannerMessage", "Please select both a starting location and a destination."); return;
  }
  showMessage("plannerMessage", "Calculating route...");
  try {
    const r = await fetch("/get-directions", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({start_lat:startPoint.lat,start_lon:startPoint.lon,end_lat:destPoint.lat,end_lon:destPoint.lon,mode:travelMode})
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error);
    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = L.geoJSON(d.route.geometry, {style:{weight:5}}).addTo(map);
    map.fitBounds(routeLayer.getBounds(), {padding:[30,30]});
    document.getElementById("fromName").textContent = startPoint.name;
    document.getElementById("toName").textContent = destPoint.name;
    document.getElementById("distance").textContent = d.route.distance_km + " km";
    document.getElementById("duration").textContent = formatDuration(d.route.duration_minutes);
    document.getElementById("planResults").classList.remove("hidden");
    showMessage("plannerMessage", "");
    await Promise.all([loadMiniNearby("startNearby", startPoint), loadMiniNearby("destNearby", destPoint)]);
    window.currentRoute = d.route;
  } catch(e) { showMessage("plannerMessage", e.message); }
}

function formatDuration(min) {
  const total = Math.round(min), h = Math.floor(total/60), m = total%60;
  return h ? `${h} hr ${m} min` : `${m} min`;
}

async function loadMiniNearby(containerId, point, showLoading = false) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (showLoading) el.innerHTML = "<p>Loading all nearby places...</p>";
  const radius = document.querySelector('input[name="radius"]:checked').value;
  try {
    const r = await fetch(`/nearby-places?lat=${point.lat}&lon=${point.lon}&category=all&radius=${radius}`);
    const d = await r.json();
    if (!d.success) throw new Error(d.error);

    // Keep the nearby markers separate from the start/destination markers.
    if (!window.nearbyJourneyLayer) window.nearbyJourneyLayer = L.layerGroup().addTo(map);
    const prefix = containerId === "startNearby" ? "start" : "dest";
    if (!window.nearbyJourneyData) window.nearbyJourneyData = {start: [], dest: []};
    window.nearbyJourneyData[prefix] = d.results;

    // Clear old markers for this side only.
    if (!window.nearbyJourneyMarkerLayers) {
      window.nearbyJourneyMarkerLayers = {start: L.layerGroup().addTo(map), dest: L.layerGroup().addTo(map)};
    }
    window.nearbyJourneyMarkerLayers[prefix].clearLayers();

    d.results.forEach(x => {
      const marker = L.marker([x.lat, x.lon]);
      marker.bindPopup(`<b>${escapeHtml(x.name)}</b><br>${escapeHtml(x.category)}<br>${x.distance_km} km away`);
      marker.addTo(window.nearbyJourneyMarkerLayers[prefix]);
    });

    const groups = {};
    d.results.forEach(x => { (groups[x.category] ||= []).push(x); });
    const categoryOrder = ["Hospital", "Bus Station", "Railway Station", "Airport", "Seaport", "Hotel", "Restaurant"];
    const sections = categoryOrder.filter(cat => groups[cat]).map(cat => {
      const items = groups[cat];
      return `<div class="mini-category"><h4>${escapeHtml(cat)} <span>(${items.length})</span></h4>` +
        items.map(x => {
          return `<button type="button" class="mini-place clickable-place" data-place-index="${d.results.indexOf(x)}" data-place-side="${prefix}">` +
            `<b>${escapeHtml(x.name)}</b><span>${escapeHtml(x.category)} · ${x.distance_km} km</span></button>`;
        }).join("") + `</div>`;
    });

    el.innerHTML = sections.length
      ? sections.join("")
      : `<p>No nearby places found within ${radius} km. Try increasing the search radius.</p>`;
    el.querySelectorAll("[data-place-index]").forEach(button => {
      button.addEventListener("click", () => {
        const place = window.nearbyJourneyData[button.dataset.placeSide]?.[Number(button.dataset.placeIndex)];
        focusJourneyPlace(place, button.dataset.placeSide);
      });
    });

    if (!showLoading) {
      // Keep the user's current map view while refreshing the list.
      return;
    }
  } catch(e) {
    el.innerHTML = `<p>${escapeHtml(e.message)}</p>`;
  }
}

function focusJourneyPlace(place, side) {
  if (!map || !place) return;
  map.setView([place.lat, place.lon], 16);
  if (!window.nearbyJourneyMarkerLayers) return;
  const layer = window.nearbyJourneyMarkerLayers[side];
  if (!layer) return;
  layer.eachLayer(marker => {
    const ll = marker.getLatLng();
    if (Math.abs(ll.lat - Number(place.lat)) < 0.000001 && Math.abs(ll.lng - Number(place.lon)) < 0.000001) {
      marker.openPopup();
    }
  });
}

async function saveTrip() {
  if (!startPoint || !destPoint || !window.currentRoute) return;
  const payload = {
    start_location:startPoint.name,start_latitude:startPoint.lat,start_longitude:startPoint.lon,
    destination:destPoint.name,destination_latitude:destPoint.lat,destination_longitude:destPoint.lon,
    distance:window.currentRoute.distance_km,estimated_time:window.currentRoute.duration_minutes,
    route_geometry:window.currentRoute.geometry,
    destinations:[]
  };
  try {
    const r = await fetch("/create-trip",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const d = await r.json();
    if (!d.success) throw new Error(d.error);
    const link = document.getElementById("viewTripLink");
    link.href = "/my-trip?id=" + d.trip_id; link.classList.remove("hidden");
    link.textContent = "View Complete Plan";
  } catch(e) { showMessage("plannerMessage", e.message); }
}
