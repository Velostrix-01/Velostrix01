function toggleSubject(id, el) {
  const content = document.getElementById(id);
  const parent = el.closest(".subject");

  if (content.style.display === "block") {
    content.style.display = "none";
    parent.classList.remove("active");
  } else {
    content.style.display = "block";
    parent.classList.add("active");
  }
}

function toggleMenu() {
  document.getElementById("nav-menu").classList.toggle("show");
}

