const { createClient } = window.supabase;
const cfg = window.APP_CONFIG;
const supabaseClient = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
let staffContext = null;
let allMembers = [];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[ch]));
}
function toast(message, type = "normal") {
  const el = $("toast"); el.textContent = message; el.className = `toast show ${type}`; setTimeout(() => el.className = "toast", 2800);
}
function formatDate(value) { return value ? new Date(value).toLocaleDateString() : "—"; }

function renderMembers() {
  const q = $("searchInput").value.trim().toLowerCase();
  const rows = allMembers.filter(m => [m.full_name, m.username].some(x => String(x || "").toLowerCase().includes(q)));
  const tbody = $("memberRows");
  if (!rows.length) { tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">No memberships found.</td></tr>`; return; }
  tbody.innerHTML = rows.map(m => {
    const target = Number(m.required_visits || 6), visits = Number(m.visit_count || 0), active = !!m.active_reward_id;
    return `<tr>
      <td><div class="table-name">${escapeHtml(m.full_name)}</div><div class="table-sub">@${escapeHtml(m.username)}</div></td>
      <td><strong>${visits}</strong> / ${target}</td>
      <td>${active ? `<span class="badge badge-gold">Active</span><div class="table-sub">Until ${escapeHtml(formatDate(m.active_reward_expires_at))}</div>` : `<span class="badge">${visits >= target ? "Processing" : "In progress"}</span>`}</td>
      <td>${escapeHtml(formatDate(m.joined_at))}</td>
      <td class="action-cell"><button class="btn btn-small btn-primary" data-visit="${escapeHtml(m.membership_id)}" ${active ? "disabled" : ""}>Mark visit</button>${active ? `<button class="btn btn-small btn-ghost" data-redeem="${escapeHtml(m.active_reward_id)}">Redeem</button>` : ""}</td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-visit]").forEach(btn => btn.addEventListener("click", async () => {
    btn.disabled = true;
    const { error } = await supabaseClient.rpc("staff_mark_visit", { p_membership_id: btn.dataset.visit });
    if (error) { toast(error.message || "Could not mark visit.", "error"); btn.disabled = false; return; }
    toast("Visit added."); await refreshData();
  }));
  tbody.querySelectorAll("[data-redeem]").forEach(btn => btn.addEventListener("click", async () => {
    btn.disabled = true;
    const { error } = await supabaseClient.rpc("staff_redeem_reward", { p_reward_id: btn.dataset.redeem });
    if (error) { toast(error.message || "Could not redeem reward.", "error"); btn.disabled = false; return; }
    toast("Reward redeemed."); await refreshData();
  }));
}

async function getStaffContext() {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !userData.user) { window.location.href = "admin-login.html"; return; }
  const { data, error } = await supabaseClient.rpc("get_staff_context");
  if (error) throw error;
  if (!data?.length) throw new Error("Your staff account is not assigned to a venue yet.");
  staffContext = data[0];
  $("staffVenueName").textContent = staffContext.venue_name;
}

async function refreshData() {
  const { data, error } = await supabaseClient.rpc("get_staff_loyalty");
  if (error) throw error;
  allMembers = data || [];
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const monthVisits = allMembers.reduce((n, m) => n + Number(m.visits_this_month || 0), 0);
  const activeRewards = allMembers.filter(m => m.active_reward_id).length;
  const redeemed = allMembers.reduce((n, m) => n + Number(m.redeemed_rewards || 0), 0);
  $("statMembers").textContent = allMembers.length;
  $("statVisits").textContent = monthVisits;
  $("statRewards").textContent = activeRewards;
  $("statRedeemed").textContent = redeemed;
  renderMembers();
}

$("searchInput").addEventListener("input", renderMembers);
$("logoutBtn").addEventListener("click", async () => { await supabaseClient.auth.signOut(); window.location.href = "admin-login.html"; });
$("openSearchCustomer").addEventListener("click", () => { $("customerSearchResult").hidden = true; $("customerSearchResult").innerHTML = ""; $("customerUsername").value = ""; $("customerSearchDialog").showModal(); });
$("closeSearchCustomer").addEventListener("click", () => $("customerSearchDialog").close());

$("customerSearchForm").addEventListener("submit", async e => {
  e.preventDefault();
  const username = $("customerUsername").value.trim().toLowerCase();
  if (!/^[a-z0-9]{3,30}$/.test(username)) { toast("Enter a valid username.", "error"); return; }
  const result = $("customerSearchResult"); result.hidden = false; result.innerHTML = `<div class="search-result loading-card">Searching…</div>`;
  const { data, error } = await supabaseClient.rpc("staff_search_customer", { p_username: username });
  if (error) { result.innerHTML = `<div class="search-result error-box">${escapeHtml(error.message)}</div>`; return; }
  const customer = data?.[0];
  if (!customer) { result.innerHTML = `<div class="search-result"><strong>No customer found.</strong><p>Ask them to create a customer account first.</p></div>`; return; }
  result.innerHTML = `<div class="search-result"><div><span class="card-kicker">CUSTOMER</span><h3>${escapeHtml(customer.full_name)}</h3><p>@${escapeHtml(customer.username)}</p></div><button class="btn btn-primary" id="addMembershipBtn" ${customer.already_member ? "disabled" : ""}>${customer.already_member ? "Already a member" : "Add loyalty"}</button></div>`;
  if (!customer.already_member) {
    $("addMembershipBtn").addEventListener("click", async () => {
      const btn = $("addMembershipBtn"); btn.disabled = true;
      const { error: addError } = await supabaseClient.rpc("staff_add_membership", { p_customer_id: customer.customer_id });
      if (addError) { toast(addError.message || "Could not add loyalty.", "error"); btn.disabled = false; return; }
      toast(`${customer.full_name} added to loyalty.`);
      $("customerSearchDialog").close();
      await refreshData();
    });
  }
});

(async function boot() {
  try {
    if (cfg.SUPABASE_URL.includes("YOUR-PROJECT") || !cfg.SUPABASE_ANON_KEY) { window.location.href = "admin-login.html"; return; }
    await getStaffContext();
    await refreshData();
  } catch (err) {
    console.error(err); toast(err.message || "Could not load dashboard.", "error");
  }
})();
