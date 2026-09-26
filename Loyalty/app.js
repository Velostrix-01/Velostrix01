const { createClient } = window.supabase;
const cfg = window.APP_CONFIG;
const supabaseClient = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
let venues = [];
let offers = [];
let currentProfile = null;
let pendingAuth = { mode: null, phone: "", name: "", username: "" };

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[ch]));
}

function toast(message, type = "normal") {
  const el = $("toast");
  el.textContent = message;
  el.className = `toast show ${type}`;
  setTimeout(() => el.className = "toast", 2800);
}

function formatPhone(input) {
  const raw = String(input || "").replace(/[^0-9+]/g, "");
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  return raw;
}

function validUsername(username) {
  return /^[a-z0-9]{3,30}$/.test(username);
}

function initials(name) {
  return String(name || "Venue").trim().split(/\s+/).slice(0,2).map(x => x[0]?.toUpperCase() || "").join("") || "V";
}

function typeLabel(type) {
  const t = String(type || "").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function renderVenueCard(v) {
  const photo = Array.isArray(v.photos) && v.photos[0] ? `<img src="${escapeHtml(v.photos[0])}" alt="${escapeHtml(v.name)}" loading="lazy">` : `<div class="venue-placeholder"><span>${escapeHtml(initials(v.name))}</span></div>`;
  return `
    <article class="venue-card">
      <div class="venue-visual">${photo}<span class="venue-type">${escapeHtml(typeLabel(v.type))}</span></div>
      <div class="venue-body">
        <div class="card-topline"><span class="card-kicker">${escapeHtml(cfg.CITY_SHORT)}</span><span class="venue-status">Registered</span></div>
        <h3>${escapeHtml(v.name)}</h3>
        <p>${escapeHtml(v.tagline || "A little more every time.")}</p>
        <div class="venue-footer"><span>${escapeHtml(v.address || "Sambhaji Nagar")}</span><button class="link-btn" data-venue="${escapeHtml(v.slug)}">View venue ↗</button></div>
      </div>
    </article>`;
}

function renderVenues() {
  const q = $("venueSearch").value.trim().toLowerCase();
  const type = $("venueTypeFilter").value;
  const filtered = venues.filter(v => {
    const matchesQuery = !q || [v.name, v.tagline, v.address, v.type].some(x => String(x || "").toLowerCase().includes(q));
    const matchesType = type === "all" || String(v.type).toLowerCase() === type;
    return matchesQuery && matchesType;
  });
  $("venueGrid").innerHTML = filtered.map(renderVenueCard).join("");
  $("venueEmpty").hidden = filtered.length > 0;
  document.querySelectorAll("[data-venue]").forEach(btn => btn.addEventListener("click", () => openVenue(btn.dataset.venue)));
}

function renderOffers() {
  if (!offers.length) {
    $("offerGrid").innerHTML = `<article class="empty-card"><span class="card-kicker">OFFERS</span><h3>No live offers yet.</h3><p>Registered venues can publish offers here.</p></article>`;
    return;
  }
  $("offerGrid").innerHTML = offers.map(o => `
    <article class="offer-card">
      <span class="card-kicker">${escapeHtml(o.venue_name || cfg.CITY_SHORT)}</span>
      <h3>${escapeHtml(o.title)}</h3>
      <p>${escapeHtml(o.description || "")}</p>
      ${o.terms ? `<small>${escapeHtml(o.terms)}</small>` : ""}
      <button class="link-btn" data-venue="${escapeHtml(o.venue_slug)}">View venue ↗</button>
    </article>`).join("");
  document.querySelectorAll("#offerGrid [data-venue]").forEach(btn => btn.addEventListener("click", () => openVenue(btn.dataset.venue)));
}

async function loadPublicData() {
  const [{ data: venueData, error: venueError }, { data: offerData, error: offerError }] = await Promise.all([
    supabaseClient.from("venues").select("id,slug,name,type,city,tagline,address,phone,about,hours,photos,active").eq("active", true).eq("city", cfg.CITY).order("name"),
    supabaseClient.from("offers").select("id,venue_id,title,description,terms,venue:venues!inner(slug,name,city)").eq("active", true).eq("venues.city", cfg.CITY).order("sort_order").order("created_at", { ascending: false })
  ]);
  if (venueError) throw venueError;
  if (offerError) throw offerError;
  venues = venueData || [];
  offers = (offerData || []).map(o => ({ ...o, venue_slug: o.venue?.slug, venue_name: o.venue?.name })).filter(o => o.venue_slug);
  renderVenues();
  renderOffers();
}

async function openVenue(slug) {
  const venue = venues.find(v => v.slug === slug);
  if (!venue) return;
  const [{ data: menuData, error: menuError }, { data: venueOffers, error: offersError }] = await Promise.all([
    supabaseClient.from("menus").select("id,title,file_url").eq("venue_id", venue.id).eq("active", true).order("sort_order"),
    supabaseClient.from("offers").select("id,title,description,terms").eq("venue_id", venue.id).eq("active", true).order("sort_order")
  ]);
  if (menuError || offersError) {
    toast((menuError || offersError).message || "Could not load venue details.", "error");
    return;
  }
  const hours = venue.hours && typeof venue.hours === "object" ? Object.entries(venue.hours).map(([day, value]) => `<div class="hours-row"><span>${escapeHtml(day)}</span><strong>${escapeHtml(value)}</strong></div>`).join("") : `<p class="muted">Hours not published yet.</p>`;
  const photos = Array.isArray(venue.photos) && venue.photos.length ? `<div class="photo-strip">${venue.photos.map(p => `<img src="${escapeHtml(p)}" alt="${escapeHtml(venue.name)}" loading="lazy">`).join("")}</div>` : "";
  const venueOfferHtml = venueOffers?.length ? venueOffers.map(o => `<div class="detail-offer"><strong>${escapeHtml(o.title)}</strong><p>${escapeHtml(o.description || "")}</p>${o.terms ? `<small>${escapeHtml(o.terms)}</small>` : ""}</div>`).join("") : `<p class="muted">No active offers at the moment.</p>`;
  const menuHtml = menuData?.length ? menuData.map(m => `<a class="menu-link" href="${escapeHtml(m.file_url)}" target="_blank" rel="noopener"><span>${escapeHtml(m.title || "Menu")}</span><span>PDF ↗</span></a>`).join("") : `<p class="muted">Menu PDF not published yet.</p>`;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address || venue.name + ", " + cfg.CITY)}`;
  $("venueModalContent").innerHTML = `
    ${photos}
    <span class="eyebrow">${escapeHtml(typeLabel(venue.type))} · ${escapeHtml(cfg.CITY_SHORT)}</span>
    <h2>${escapeHtml(venue.name)}</h2>
    <p class="venue-modal-tagline">${escapeHtml(venue.tagline || "A little more every time.")}</p>
    <div class="venue-detail-grid">
      <div class="detail-block"><span class="card-kicker">ABOUT</span><p>${escapeHtml(venue.about || "Venue information coming soon.")}</p></div>
      <div class="detail-block"><span class="card-kicker">CONTACT</span><p>${escapeHtml(venue.address || cfg.CITY)}</p>${venue.phone ? `<a class="link-btn" href="tel:${escapeHtml(venue.phone)}">${escapeHtml(venue.phone)}</a>` : ""}<a class="link-btn" href="${maps}" target="_blank" rel="noopener">Open in Maps ↗</a></div>
      <div class="detail-block"><span class="card-kicker">HOURS</span>${hours}</div>
      <div class="detail-block"><span class="card-kicker">OFFERS</span>${venueOfferHtml}</div>
      <div class="detail-block detail-block-full"><span class="card-kicker">MENU</span><div class="menu-list">${menuHtml}</div></div>
    </div>`;
  $("venueDialog").showModal();
}

function showAuthChoice() {
  $("authChoiceView").hidden = false;
  $("signupForm").hidden = true;
  $("signinForm").hidden = true;
  $("authError").textContent = "";
  $("forgotPasswordInfo").hidden = true;
}

function showAuthMode(mode) {
  pendingAuth.mode = mode;
  $("authChoiceView").hidden = true;
  $("signupForm").hidden = mode !== "signup";
  $("signinForm").hidden = mode !== "signin";
  $("authError").textContent = "";
  $("forgotPasswordInfo").hidden = true;
}

function showAuthError(message) { $("authError").textContent = message || "Something went wrong."; }

function authEmail(username) { return `${username}@customers.loyaltyos.local`; }

async function createCustomerAccount(name, phone, username, password) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: authEmail(username), password,
    options: { data: { username, full_name: name, phone: formatPhone(phone) } }
  });
  if (error) throw error;
  if (!data?.user) throw new Error("Account could not be created.");
  if (!data.session) throw new Error("Account created, but sign-in confirmation is enabled. Disable email confirmation in Supabase Auth for this username/password setup.");
  const { error: profileError } = await supabaseClient.rpc("create_customer_profile", {
    p_full_name: name, p_phone: formatPhone(phone), p_username: username
  });
  if (profileError) throw profileError;
  await loadCustomerState();
  $("authDialog").close();
  toast("Account created.");
}

async function signInCustomer(username, password) {
  const { error } = await supabaseClient.auth.signInWithPassword({ email: authEmail(username), password });
  if (error) throw error;
  await loadCustomerState();
  $("authDialog").close();
  toast("Signed in.");
}

async function loadCustomerState() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const session = sessionData?.session;
  if (!session) {
    currentProfile = null;
    renderProfile();
    renderLoyalty([]);
    $("heroMembershipCount").textContent = "—";
    return;
  }
  const { data: profile, error: profileError } = await supabaseClient.rpc("get_my_profile");
  if (profileError) {
    currentProfile = null;
    renderProfile("No customer profile found. Please sign up from the customer app.");
    renderLoyalty([]);
    return;
  }
  currentProfile = profile?.[0] || null;
  const { data: memberships, error } = await supabaseClient.rpc("get_my_loyalty");
  if (error) throw error;
  renderProfile();
  renderLoyalty(memberships || []);
  $("heroMembershipCount").textContent = String((memberships || []).length);
}

function renderProfile(errorMessage = "") {
  if (!currentProfile) {
    $("profileMeta").innerHTML = `<div class="profile-row"><span>Status</span><strong>${escapeHtml(errorMessage || "Not signed in")}</strong></div><div class="profile-row"><span>City</span><strong>${escapeHtml(cfg.CITY_SHORT)}</strong></div>`;
    $("profileActions").innerHTML = `<button class="btn btn-primary" id="profileAuthBtn">Create account</button>`;
    $("authBtn").textContent = "Sign in";
  } else {
    $("profileMeta").innerHTML = `<div class="profile-row"><span>Name</span><strong>${escapeHtml(currentProfile.full_name)}</strong></div><div class="profile-row"><span>Username</span><strong>@${escapeHtml(currentProfile.username)}</strong></div><div class="profile-row"><span>City</span><strong>${escapeHtml(cfg.CITY_SHORT)}</strong></div>`;
    $("profileActions").innerHTML = `<button class="btn btn-ghost" id="profileLogoutBtn">Sign out</button>`;
    $("authBtn").textContent = "Account";
  }
  const profileAuthBtn = $("profileAuthBtn");
  if (profileAuthBtn) profileAuthBtn.addEventListener("click", () => $("authDialog").showModal());
  const profileLogoutBtn = $("profileLogoutBtn");
  if (profileLogoutBtn) profileLogoutBtn.addEventListener("click", signOut);
}

function renderLoyalty(memberships) {
  const el = $("loyaltyContent");
  if (!currentProfile) {
    el.innerHTML = `<div class="auth-prompt"><div><span class="card-kicker">ACCOUNT REQUIRED</span><h3>Sign in to see your memberships.</h3><p>All your venue programs live under one customer account.</p></div><button class="btn btn-primary" id="loyaltyAuthBtn">Sign in / sign up</button></div>`;
    $("loyaltyAuthBtn").addEventListener("click", () => $("authDialog").showModal());
    return;
  }
  if (!memberships.length) {
    el.innerHTML = `<div class="empty-card"><span class="card-kicker">NO MEMBERSHIPS YET</span><h3>Join your first venue.</h3><p>Go to Explore, show your username to staff, and they can add the venue to your account.</p></div>`;
    return;
  }
  el.innerHTML = memberships.map(m => {
    const target = Number(m.required_visits || 6);
    const visits = Number(m.visit_count || 0);
    const progress = Math.min(100, visits / target * 100);
    const active = !!m.active_reward_id;
    const rewardText = active ? `${m.reward_label} unlocked` : `${Math.max(0, target - visits)} visit${target - visits === 1 ? "" : "s"} to go`;
    return `<article class="membership-card">
      <div class="membership-top"><div><span class="card-kicker">${escapeHtml(typeLabel(m.venue_type))}</span><h3>${escapeHtml(m.venue_name)}</h3><span class="username-chip">@${escapeHtml(currentProfile.username)}</span></div><div class="membership-mark">${escapeHtml(initials(m.venue_name))}</div></div>
      <div class="progress-meta"><span>Visits</span><strong>${visits} / ${target}</strong></div>
      <div class="progress-bar"><span style="width:${progress}%"></span></div>
      <div class="reward-line ${active ? "unlocked" : ""}"><strong>${escapeHtml(rewardText)}</strong><span>${active ? `Valid until ${new Date(m.active_reward_expires_at).toLocaleDateString()}` : escapeHtml(m.reward_label || "Reward")}</span></div>
      <div class="membership-actions"><button class="link-btn" data-venue="${escapeHtml(m.venue_slug)}">View venue ↗</button></div>
    </article>`;
  }).join("");
  document.querySelectorAll("#loyaltyContent [data-venue]").forEach(btn => btn.addEventListener("click", () => openVenue(btn.dataset.venue)));
}

async function signOut() {
  await supabaseClient.auth.signOut();
  currentProfile = null;
  renderProfile();
  renderLoyalty([]);
  $("heroMembershipCount").textContent = "—";
  toast("Signed out.");
}

$("authBtn").addEventListener("click", () => $("authDialog").showModal());
$("heroAuthBtn").addEventListener("click", () => $("authDialog").showModal());
$("loyaltyAuthBtn")?.addEventListener("click", () => $("authDialog").showModal());
$("profileAuthBtn")?.addEventListener("click", () => $("authDialog").showModal());
$("closeAuth").addEventListener("click", () => $("authDialog").close());
$("closeVenue").addEventListener("click", () => $("venueDialog").close());
$("chooseSignup").addEventListener("click", () => showAuthMode("signup"));
$("chooseSignin").addEventListener("click", () => showAuthMode("signin"));
document.querySelectorAll("[data-auth-back]").forEach(btn => btn.addEventListener("click", showAuthChoice));
$("venueSearch").addEventListener("input", renderVenues);
$("venueTypeFilter").addEventListener("change", renderVenues);

$("signupUsername").addEventListener("input", e => { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""); });

$("signupForm").addEventListener("submit", async e => {
  e.preventDefault(); showAuthError("");
  const name = $("signupName").value.trim();
  const phone = $("signupPhone").value.trim();
  const username = $("signupUsername").value.trim().toLowerCase();
  const password = $("signupPassword").value;
  if (name.length < 2) return showAuthError("Enter your full name.");
  if (!validUsername(username)) return showAuthError("Username must be 3–30 characters using lowercase letters and numbers only.");
  if (password.length < 8) return showAuthError("Password must be at least 8 characters.");
  if (password !== $("signupPasswordConfirm").value) return showAuthError("Passwords do not match.");
  try { await createCustomerAccount(name, phone, username, password); } catch (err) { showAuthError(err.message); }
});

$("signinForm").addEventListener("submit", async e => {
  e.preventDefault(); showAuthError("");
  const username = $("signinUsername").value.trim().toLowerCase();
  if (!validUsername(username)) return showAuthError("Enter a valid username.");
  try { await signInCustomer(username, $("signinPassword").value); } catch (err) { showAuthError("Could not sign in. Check your username and password."); }
});

$("forgotPasswordBtn").addEventListener("click", () => {
  const box = $("forgotPasswordInfo");
  box.hidden = !box.hidden;
  const phone = String(cfg.SUPPORT_PHONE || "").trim();
  $("supportContact").innerHTML = phone
    ? `<a class="btn btn-primary btn-small" href="tel:${escapeHtml(phone)}">Call customer care · ${escapeHtml(phone)}</a>`
    : `<p class="field-hint">Customer care phone number has not been added yet.</p>`;
});

supabaseClient.auth.onAuthStateChange(() => {
  setTimeout(() => loadCustomerState().catch(err => toast(err.message || "Could not load account.", "error")), 0);
});

(async function boot() {
  try {
    if (cfg.SUPABASE_URL.includes("YOUR-PROJECT") || !cfg.SUPABASE_ANON_KEY) throw new Error("Add your Supabase project values in config.js.");
    await loadPublicData();
    await loadCustomerState();
  } catch (err) {
    console.error(err);
    toast(err.message || "Could not load the app.", "error");
  }
})();
