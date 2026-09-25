const { createClient } = window.supabase;
const cfg = window.APP_CONFIG;
const supabaseClient = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const hotelSlug = params.get("hotel") || cfg.DEFAULT_HOTEL_SLUG;
const cardToken = params.get("card");

const $ = (id) => document.getElementById(id);

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (ch) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value ?? "";
}

function showError(message) {
  $("loadError").hidden = false;
  $("loadErrorText").textContent = message;
}

function initials(name) {
  const parts = String(name || "Hotel").trim().split(/\s+/).slice(0,2);
  return parts.map(x => x[0]?.toUpperCase() || "").join("") || "H";
}

function daysLeft(isoDate) {
  const end = new Date(isoDate);
  const now = new Date();
  return Math.max(0, Math.ceil((end - now) / 86400000));
}

async function loadHotel() {
  const { data, error } = await supabaseClient.rpc("get_hotel_public", { p_slug: hotelSlug });
  if (error) throw error;
  if (!data?.length) throw new Error("Hotel not found.");
  const hotel = data[0];

  document.title = `${hotel.name} — Loyalty`;
  setText("hotelBrand", hotel.name);
  setText("hotelName", hotel.name);
  setText("hotelTagline", hotel.tagline);
  setText("footerHotel", hotel.name);
  setText("experienceTitle", hotel.experience_title || "Made for return visits.");
  setText("visitTitle", hotel.visit_title || "See you again soon.");
  setText("hotelAddress", hotel.address || "Visit us soon.");

  $("hotelMonogram").textContent = initials(hotel.name);
  $("visitTarget").textContent = hotel.required_visits ?? 6;

  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address || hotel.name)}`;
  $("mapsLink").href = maps;
  if (hotel.phone) {
    $("phoneLink").href = `tel:${hotel.phone}`;
  } else {
    $("phoneLink").setAttribute("aria-disabled", "true");
  }

  return hotel;
}

function renderDots(visits, target) {
  const container = $("visitDots");
  container.innerHTML = "";
  for (let i = 1; i <= target; i++) {
    const dot = document.createElement("span");
    dot.className = `visit-dot ${i <= visits ? "done" : ""} ${i === visits + 1 ? "next" : ""}`;
    dot.innerHTML = i <= visits ? "✓" : i;
    container.appendChild(dot);
  }
}

async function loadCard(hotel) {
  if (!cardToken) {
    $("loyalty").querySelector(".loyalty-shell").style.display = "none";
    $("missingCard").hidden = false;
    return;
  }

  const { data, error } = await supabaseClient.rpc("get_customer_card", { p_card_token: cardToken });
  if (error) throw error;
  if (!data?.length) throw new Error("That loyalty link is invalid or expired.");

  const card = data[0];
  if (card.hotel_slug !== hotel.slug) {
    throw new Error("This loyalty link belongs to a different hotel.");
  }

  const visits = Number(card.visit_count || 0);
  const target = Number(card.required_visits || 6);
  const progress = Math.min(100, (visits / target) * 100);

  setText("customerName", card.customer_name);
  setText("visitCount", visits);
  setText("visitTarget", target);
  $("progressFill").style.width = `${progress}%`;
  setText("cardId", `CARD • ${String(card.card_token).slice(0, 8).toUpperCase()}`);

  renderDots(visits, target);

  const rewardPanel = $("rewardPanel");
  if (card.active_reward_id) {
    rewardPanel.classList.add("unlocked");
    setText("rewardTitle", `${hotel.reward_label} unlocked`);
    setText("rewardDescription", hotel.reward_description);

    const left = daysLeft(card.active_reward_expires_at);
    setText("expiryText", left > 0 ? `Valid for ${left} more day${left === 1 ? "" : "s"}` : "Reward expired");
  } else {
    rewardPanel.classList.remove("unlocked");
    const remaining = Math.max(0, target - visits);
    setText("rewardTitle", remaining === 0 ? "Reward processing." : `${remaining} visit${remaining === 1 ? "" : "s"} to go.`);
    setText("rewardDescription", `Complete ${target} eligible visits to unlock ${hotel.reward_label.toLowerCase()}.`);
    setText("expiryText", "No active reward");
  }
}

(async function boot() {
  try {
    if (cfg.SUPABASE_URL.includes("YOUR-PROJECT") || cfg.SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY") {
      showError("Add your Supabase URL and anon key in config.js, then reload.");
      return;
    }

    const hotel = await loadHotel();
    await loadCard(hotel);
  } catch (err) {
    console.error(err);
    showError(err.message || "Something went wrong.");
  }
})();
