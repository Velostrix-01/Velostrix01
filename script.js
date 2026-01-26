function toggleSubject(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "block" ? "none" : "block";
}
function toggleMenu() {
  document.getElementById("nav-menu").classList.toggle("show");
}
