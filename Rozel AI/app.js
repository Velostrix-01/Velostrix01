
const navigationItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

function showPage(pageId) {
    pages.forEach(page => {
        page.classList.toggle("active", page.id === pageId);
    });

    navigationItems.forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === pageId
        );
    });
}

navigationItems.forEach(item => {
    item.addEventListener("click", () => {
        showPage(item.dataset.page);
    });
});

document.getElementById("start-btn").addEventListener("click", () => {
    showPage("settings");
});

console.log("Virtual Human website initialized.");

