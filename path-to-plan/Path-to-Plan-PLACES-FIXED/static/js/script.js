function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function showMessage(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message || "";
}
