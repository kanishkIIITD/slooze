const API_BASE = "";

function qs(id) {
  return document.getElementById(id);
}

function showToast(message, isError = false) {
  const toast = qs("toast");
  toast.textContent = message;
  toast.className = `toast${isError ? " error" : ""}`;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3500);
}

function getToken() {
  return localStorage.getItem("token") || "";
}

function setToken(token) {
  localStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

function setUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

async function api(path, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});
  if (!headers["Content-Type"] && opts.body) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
  if (!res.ok) {
    const msg = (data && data.message) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

let state = {
  restaurants: [],
  selectedRestaurant: null,
  menu: [],
  cart: {}, // { menuItemId: { menuItem, qty } }
  paymentMethods: [],
  order: null
};

function cartTotal() {
  let total = 0;
  for (const k of Object.keys(state.cart)) {
    const entry = state.cart[k];
    total += entry.menuItem.price * entry.qty;
  }
  return total;
}

function renderTopbar() {
  const user = getUser();
  const pill = qs("userPill");
  const logoutBtn = qs("logoutBtn");
  if (!user) {
    pill.style.display = "none";
    logoutBtn.style.display = "none";
    return;
  }
  pill.style.display = "inline-flex";
  pill.textContent = `${user.name} • ${user.role} • ${user.country}`;
  logoutBtn.style.display = "inline-flex";
}

function renderRestaurants() {
  const el = qs("restaurants");
  el.innerHTML = "";
  if (!state.restaurants.length) {
    el.innerHTML = `<div class="muted small">No restaurants visible.</div>`;
    return;
  }

  for (const r of state.restaurants) {
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `
      <div>
        <div style="font-weight: 600">${r.name}</div>
        <div class="muted small">${r.country}</div>
      </div>
      <button class="secondary">View menu</button>
    `;
    row.querySelector("button").addEventListener("click", () => selectRestaurant(r));
    el.appendChild(row);
  }
}

function renderMenu() {
  const section = qs("menuSection");
  const menuEl = qs("menu");
  const nameEl = qs("selectedRestaurantName");

  if (!state.selectedRestaurant) {
    section.style.display = "none";
    menuEl.innerHTML = "";
    nameEl.textContent = "";
    return;
  }

  section.style.display = "block";
  nameEl.textContent = `${state.selectedRestaurant.name} (${state.selectedRestaurant.country})`;
  menuEl.innerHTML = "";

  for (const item of state.menu) {
    const row = document.createElement("div");
    row.className = "list-item";
    const qty = state.cart[item.id]?.qty || 0;
    row.innerHTML = `
      <div>
        <div style="font-weight: 600">${item.name}</div>
        <div class="muted small">Price: ${item.price}</div>
      </div>
      <div class="row">
        <button class="secondary" ${qty <= 0 ? "disabled" : ""}>-</button>
        <div style="min-width: 26px; text-align: center; font-weight: 600">${qty}</div>
        <button>+</button>
      </div>
    `;
    const [minusBtn, , plusBtn] = row.querySelectorAll("button,div");
    row.querySelectorAll("button")[0].addEventListener("click", () => addToCart(item, -1));
    row.querySelectorAll("button")[1].addEventListener("click", () => addToCart(item, +1));
    menuEl.appendChild(row);
  }
}

function renderCart() {
  qs("cartTotal").textContent = String(cartTotal());
  qs("createOrderBtn").disabled = !state.selectedRestaurant || cartTotal() <= 0;
}

function renderOrder() {
  const orderSection = qs("orderSection");
  const orderIdEl = qs("orderId");
  const statusEl = qs("orderStatus");
  const checkoutBtn = qs("checkoutBtn");
  const cancelBtn = qs("cancelBtn");
  const user = getUser();

  if (!state.order) {
    orderSection.style.display = "none";
    return;
  }

  orderSection.style.display = "block";
  orderIdEl.textContent = state.order.id;
  statusEl.textContent = state.order.status;

  const canCheckout = user.role === "ADMIN" || user.role === "MANAGER";
  const canCancel = user.role === "ADMIN" || user.role === "MANAGER";
  checkoutBtn.disabled = !canCheckout || state.order.status !== "DRAFT";
  cancelBtn.disabled = !canCancel || state.order.status !== "PLACED";
}

function renderPaymentMethods() {
  const sel = qs("paymentMethodSelect");
  sel.innerHTML = "";
  for (const pm of state.paymentMethods) {
    const opt = document.createElement("option");
    opt.value = pm.id;
    opt.textContent = `${pm.id} • ${pm.type} • ${pm.details}`;
    sel.appendChild(opt);
  }

  const user = getUser();
  const adminCard = qs("adminPaymentCard");
  adminCard.style.display = user && user.role === "ADMIN" ? "block" : "none";
  if (user && user.role === "ADMIN") {
    qs("pmJson").value = JSON.stringify(state.paymentMethods);
  }
}

function resetOrderAndCart() {
  state.cart = {};
  state.order = null;
  renderMenu();
  renderCart();
  renderOrder();
}

function addToCart(menuItem, delta) {
  if (!state.selectedRestaurant) return;
  const current = state.cart[menuItem.id]?.qty || 0;
  const next = Math.max(0, current + delta);
  if (next === 0) delete state.cart[menuItem.id];
  else state.cart[menuItem.id] = { menuItem, qty: next };
  renderMenu();
  renderCart();
}

async function login(userId) {
  const { token, user } = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ userId })
  });
  setToken(token);
  setUser(user);
  showToast(`Logged in as ${user.name}`);
  await bootAuthed();
}

async function logout() {
  clearToken();
  state = { restaurants: [], selectedRestaurant: null, menu: [], cart: {}, paymentMethods: [], order: null };
  qs("loginCard").style.display = "block";
  qs("app").style.display = "none";
  renderTopbar();
  showToast("Logged out");
}

async function loadRestaurants() {
  state.restaurants = await api("/restaurants");
  renderRestaurants();
}

async function selectRestaurant(r) {
  // Switching restaurants clears cart & order draft (simpler UI)
  state.selectedRestaurant = r;
  state.cart = {};
  state.order = null;
  renderCart();
  renderOrder();

  const payload = await api(`/restaurants/${encodeURIComponent(r.id)}/menu`);
  state.menu = payload.items;
  renderMenu();
  renderCart();
}

async function loadPaymentMethods() {
  state.paymentMethods = await api("/payment-methods");
  renderPaymentMethods();
}

async function createDraftOrder() {
  const items = Object.keys(state.cart).map((menuItemId) => ({
    menuItemId,
    quantity: state.cart[menuItemId].qty
  }));
  const order = await api("/orders", {
    method: "POST",
    body: JSON.stringify({
      restaurantId: state.selectedRestaurant.id,
      items
    })
  });
  state.order = order;
  showToast(`Created draft order ${order.id}`);
  renderOrder();
}

async function checkoutOrder() {
  if (!state.order) return;
  const pmId = qs("paymentMethodSelect").value;
  const order = await api(`/orders/${encodeURIComponent(state.order.id)}/checkout`, {
    method: "POST",
    body: JSON.stringify({ paymentMethodId: pmId })
  });
  state.order = order;
  showToast(`Order placed: ${order.id}`);
  renderOrder();
}

async function cancelOrder() {
  if (!state.order) return;
  const order = await api(`/orders/${encodeURIComponent(state.order.id)}/cancel`, { method: "POST" });
  state.order = order;
  showToast(`Order cancelled: ${order.id}`);
  renderOrder();
}

async function updatePaymentMethods() {
  const raw = qs("pmJson").value;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    showToast("Invalid JSON for methods", true);
    return;
  }
  const updated = await api("/payment-methods", {
    method: "PUT",
    body: JSON.stringify({ methods: parsed })
  });
  state.paymentMethods = updated;
  showToast("Payment methods updated");
  renderPaymentMethods();
}

async function bootAuthed() {
  qs("loginCard").style.display = "none";
  qs("app").style.display = "grid";
  renderTopbar();

  await Promise.all([loadRestaurants(), loadPaymentMethods()]);
  resetOrderAndCart();
}

function wireUI() {
  qs("loginBtn").addEventListener("click", async () => {
    const userId = qs("userSelect").value;
    try {
      await login(userId);
    } catch (e) {
      showToast(e.message || "Login failed", true);
    }
  });

  qs("logoutBtn").addEventListener("click", logout);
  qs("refreshRestaurantsBtn").addEventListener("click", async () => {
    try {
      await loadRestaurants();
      showToast("Restaurants refreshed");
    } catch (e) {
      showToast(e.message || "Failed to load restaurants", true);
    }
  });

  qs("clearCartBtn").addEventListener("click", () => {
    state.cart = {};
    state.order = null;
    renderMenu();
    renderCart();
    renderOrder();
  });

  qs("createOrderBtn").addEventListener("click", async () => {
    try {
      await createDraftOrder();
    } catch (e) {
      showToast(e.message || "Failed to create order", true);
    }
  });

  qs("checkoutBtn").addEventListener("click", async () => {
    try {
      await checkoutOrder();
    } catch (e) {
      showToast(e.message || "Checkout failed", true);
    }
  });

  qs("cancelBtn").addEventListener("click", async () => {
    try {
      await cancelOrder();
    } catch (e) {
      showToast(e.message || "Cancel failed", true);
    }
  });

  qs("updatePmBtn").addEventListener("click", async () => {
    try {
      await updatePaymentMethods();
    } catch (e) {
      showToast(e.message || "Update payment methods failed", true);
    }
  });
}

async function main() {
  wireUI();
  renderTopbar();

  const token = getToken();
  if (token) {
    try {
      // Ensure token is valid; if not, fall back to login view
      const me = await api("/me");
      setUser(me);
      await bootAuthed();
      return;
    } catch {
      clearToken();
    }
  }
}

main();

