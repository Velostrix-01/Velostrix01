const { createClient } = window.supabase;
const cfg = window.APP_CONFIG;
const supabaseClient = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
let currentStaff = null;
let currentHotel = null;
let allCustomers = [];

function toast(message, type = "normal") {
  const el = $("toast");
  el.textContent = message;
  el.className = `toast show ${type}`;
  setTimeout(() => el.className = "toast", 2600);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function cardUrl(token) {
  return `${cfg.APP_BASE_URL}/index.html?hotel=${encodeURIComponent(currentHotel.slug)}&card=${encodeURIComponent(token)}`;
}

function renderCustomers() {
  const q = $("searchInput").value.trim().toLowerCase();
  const rows = allCustomers.filter(c =>
    c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
  );

  const tbody = $("customerRows");
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">No members found.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(c => {
    const reward = c.active_reward
      ? `<span class="badge badge-gold">Active</span>`
      : `<span class="badge">${c.visit_count >= currentHotel.required_visits ? "Processing" : "Not unlocked"}</span>`;
    const target = currentHotel.required_visits;
    const canVisit = !c.active_reward;
    return `
      <tr>
        <td>
          <div class="table-name">${escapeHtml(c.name)}</div>
          <div class="table-sub">${escapeHtml(c.phone)}</div>
        </td>
        <td><strong>${c.visit_count}</strong> / ${target}</td>
        <td>${reward}</td>
        <td><button class="link-btn" data-copy="${escapeHtml(cardUrl(c.card_token))}">Copy link</button></td>
        <td class="action-cell">
          <button class="btn btn-small btn-primary" data-visit="${c.id}" ${canVisit ? "" : "disabled"}>Mark visit</button>
          ${c.active_reward ? `<button class="btn btn-small btn-ghost" data-redeem="${c.active_reward.id}">Redeem</button>` : ""}
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(btn.dataset.copy);
      toast("Loyalty link copied.");
    });
  });

  tbody.querySelectorAll("[data-visit]").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const { error } = await supabaseClient.rpc("mark_customer_visit", {
        p_customer_id: btn.dataset.visit
      });
      if (error) {
        console.error(error);
        toast(error.message || "Could not mark visit.", "error");
        btn.disabled = false;
        return;
      }
      toast("Visit added.");
      await refreshData();
    });
  });

  tbody.querySelectorAll("[data-redeem]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { error } = await supabaseClient.rpc("redeem_reward", {
        p_reward_id: btn.dataset.redeem
      });
      if (error) {
        console.error(error);
        toast(error.message || "Could not redeem reward.", "error");
        return;
      }
      toast("Reward redeemed.");
      await refreshData();
    });
  });
}

async function getStaffContext() {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !userData.user) {
    window.location.href = "admin-login.html";
    return;
  }

  const { data, error } = await supabaseClient
    .from("staff_profiles")
    .select("hotel_id, hotels(id, slug, name, required_visits)")
    .eq("id", userData.user.id)
    .single();

  if (error) throw error;
  currentStaff = userData.user;
  currentHotel = data.hotels;
  $("staffHotelName").textContent = currentHotel.name;
}

async function refreshData() {
  const { data: customers, error } = await supabaseClient
    .from("customers")
    .select(`
      id, name, phone, card_token, created_at,
      visits(id, visit_number, visited_at),
      rewards(id, status, unlocked_at, expires_at, redeemed_at)
    `)
    .eq("hotel_id", currentHotel.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  allCustomers = (customers || []).map(c => {
    const active = (c.rewards || [])
      .filter(r => r.status === "active" && new Date(r.expires_at) > new Date())
      .sort((a,b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))[0] || null;
    return {
      ...c,
      total_visits: (c.visits || []).length,
      visit_count: active
        ? currentHotel.required_visits
        : ((c.visits || []).length % currentHotel.required_visits),
      active_reward: active
    };
  });

  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const monthVisits = allCustomers.reduce((n, c) =>
    n + (c.visits || []).filter(v => new Date(v.visited_at) >= monthStart).length, 0);

  const activeRewards = allCustomers.filter(c => c.active_reward).length;
  const redeemed = allCustomers.reduce((n,c) =>
    n + (c.rewards || []).filter(r => r.status === "redeemed").length, 0);

  $("statCustomers").textContent = allCustomers.length;
  $("statVisits").textContent = monthVisits;
  $("statRewards").textContent = activeRewards;
  $("statRedeemed").textContent = redeemed;

  renderCustomers();
}

$("searchInput").addEventListener("input", renderCustomers);

$("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "admin-login.html";
});

$("openCreateCustomer").addEventListener("click", () => {
  $("createdCardBox").hidden = true;
  $("customerDialog").showModal();
});

$("closeCreateCustomer").addEventListener("click", () => $("customerDialog").close());

$("customerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const payload = {
    p_hotel_id: currentHotel.id,
    p_name: String(form.get("name")).trim(),
    p_phone: String(form.get("phone")).trim(),
    p_email: String(form.get("email") || "").trim() || null
  };

  const { data, error } = await supabaseClient.rpc("create_customer_card", payload);
  if (error) {
    console.error(error);
    toast(error.message || "Could not create member.", "error");
    return;
  }

  const customer = data?.[0];
  const url = cardUrl(customer.card_token);
  $("createdCardBox").hidden = false;
  $("createdCardBox").innerHTML = `
    <strong>Card created.</strong>
    <p>${escapeHtml(customer.name)} now has a private loyalty link.</p>
    <div class="generated-link">${escapeHtml(url)}</div>
    <button type="button" class="btn btn-primary btn-small" id="copyGenerated">Copy link</button>
  `;
  $("copyGenerated").addEventListener("click", async () => {
    await navigator.clipboard.writeText(url);
    toast("Card link copied.");
  });

  e.currentTarget.reset();
  await refreshData();
});

(async function boot() {
  try {
    if (cfg.SUPABASE_URL.includes("YOUR-PROJECT") || cfg.SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY") {
      window.location.href = "admin-login.html";
      return;
    }
    await getStaffContext();
    if (!currentHotel) return;
    await refreshData();
  } catch (err) {
    console.error(err);
    toast(err.message || "Could not load dashboard.", "error");
  }
})();
