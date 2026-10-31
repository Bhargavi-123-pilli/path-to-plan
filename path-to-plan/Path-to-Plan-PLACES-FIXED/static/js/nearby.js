let nearbyMap, nearbyMarkerLayer, selectedNearbyLocation=null;
document.addEventListener("DOMContentLoaded", () => {
  nearbyMap = L.map("nearbyMap").setView([16.9891,82.2475],8);
  const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:"&copy; OpenStreetMap contributors",
    maxZoom:19
  }).addTo(nearbyMap);
  tiles.on("tileerror", () => {
    showMessage("nearbyMessage", "Map tiles are taking too long to load. Check your internet connection and refresh the page.");
  });
  nearbyMarkerLayer=L.layerGroup().addTo(nearbyMap);
  setTimeout(() => nearbyMap.invalidateSize(), 250);
});
async function nearbySearchLocation() {
  const q=document.getElementById("nearbyLocation").value.trim();
  const el=document.getElementById("nearbyLocationResults");
  el.innerHTML="<div class='result-item'>Searching...</div>";
  try {
    const r=await fetch("/search-location?q="+encodeURIComponent(q)), d=await r.json();
    if(!d.success) throw new Error(d.error);
    el._data=d.results;
    el.innerHTML=d.results.map((x,i)=>`<div class="result-item" onclick="selectNearbyLocation(${i})">${escapeHtml(x.name)}</div>`).join("");
  } catch(e){el.innerHTML=`<div class="result-item">${escapeHtml(e.message)}</div>`;}
}
function selectNearbyLocation(i){
  const el=document.getElementById("nearbyLocationResults"), x=el._data[i];
  selectedNearbyLocation=x;
  document.getElementById("nearbyLocationSelected").textContent="Selected: "+x.name;
  el.innerHTML="";
  nearbyMarkerLayer.clearLayers();
  L.marker([x.lat,x.lon]).addTo(nearbyMarkerLayer).bindPopup(escapeHtml(x.name)).openPopup();
  nearbyMap.setView([x.lat,x.lon],13);
}
async function loadNearby(category){
  if(!selectedNearbyLocation){showMessage("nearbyMessage","Please search and select a location first.");return;}
  showMessage("nearbyMessage","Loading nearby places...");
  document.getElementById("nearbyCards").innerHTML="";
  const radius=document.querySelector('input[name="nearbyRadius"]:checked').value;
  try{
    const r=await fetch(`/nearby-places?lat=${selectedNearbyLocation.lat}&lon=${selectedNearbyLocation.lon}&category=${category}&radius=${radius}`);
    const d=await r.json(); if(!d.success) throw new Error(d.error);
    nearbyMarkerLayer.clearLayers();
    L.marker([selectedNearbyLocation.lat,selectedNearbyLocation.lon]).addTo(nearbyMarkerLayer).bindPopup("Selected location");
    const bounds=L.latLngBounds([[selectedNearbyLocation.lat,selectedNearbyLocation.lon]]);
    d.results.forEach(x=>{
      const marker=L.marker([x.lat,x.lon]).addTo(nearbyMarkerLayer);
      marker.bindPopup(`<b>${escapeHtml(x.name)}</b><br>${escapeHtml(x.category)}<br>${x.distance_km} km`);
      bounds.extend([x.lat,x.lon]);
    });
    if(d.results.length) nearbyMap.fitBounds(bounds,{padding:[25,25]});
    const cards=document.getElementById("nearbyCards");
    cards.innerHTML=d.results.length ? d.results.map(x=>placeCard(x,selectedNearbyLocation)).join("") :
      `<div class="notice">No nearby ${escapeHtml(category)} found within ${radius} km. Try increasing the search radius.</div>`;
    cards.querySelectorAll(".place-card").forEach((card, index) => {
      const place = d.results[index];
      card.querySelector(".show-place-location")?.addEventListener("click", () => focusNearbyPlace(place));
      card.querySelector(".place-title-link")?.addEventListener("click", () => focusNearbyPlace(place));
    });
    showMessage("nearbyMessage","");
  }catch(e){showMessage("nearbyMessage",e.message);}
}
function placeCard(x,from){
  const dest=`${x.lat},${x.lon}`;
  return `<article class="place-card">
    <h3 class="place-title-link">${escapeHtml(x.name)}</h3>
    <p class="distance">${x.distance_km} km away</p>
    <p><b>Category:</b> ${escapeHtml(x.category)}</p>
    <p><b>Address:</b> ${escapeHtml(x.address)}</p>
    ${x.phone?`<p><b>Phone:</b> ${escapeHtml(x.phone)}</p>`:""}
    ${x.cuisine?`<p><b>Cuisine:</b> ${escapeHtml(x.cuisine)}</p>`:""}
    <div class="place-actions">
      <button type="button" class="show-place-location">📍 Show Location</button>
      <a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lon}#map=18/${x.lat}/${x.lon}">Open OSM</a>
      <a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${dest}">Get Directions</a>
    </div>
  </article>`;
}

function focusNearbyPlace(place){
  if(!nearbyMap || !place) return;
  nearbyMarkerLayer.eachLayer(marker => nearbyMap.removeLayer(marker));
  const marker=L.marker([place.lat,place.lon]).addTo(nearbyMarkerLayer);
  marker.bindPopup(`<b>${escapeHtml(place.name)}</b><br>${escapeHtml(place.category)}<br>${place.distance_km} km away`).openPopup();
  nearbyMap.setView([place.lat,place.lon],17);
}
