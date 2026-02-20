export async function api(path, method = "GET", body) {
  const resp = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function clearConsent() {
  sessionStorage.removeItem("consentAccepted");
}

export function hasConsent() {
  return sessionStorage.getItem("consentAccepted") === "1";
}

export function setConsent() {
  sessionStorage.setItem("consentAccepted", "1");
}

export async function initTopbar({ requireAuth = false } = {}) {
  const userLabel = document.getElementById("userLabel");
  const loginLink = document.getElementById("loginLink");
  const logoutBtn = document.getElementById("logoutBtn");

  let me = { user: null };
  try {
    me = await api("/api/me", "GET");
  } catch {
    me = { user: null };
  }

  const user = me.user;

  if (user) {
    userLabel.textContent = user.username ? `ID: ${user.username}` : "Logged in";
    loginLink.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    userLabel.textContent = "";
    loginLink.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }

  logoutBtn?.addEventListener("click", async () => {
    try {
      await api("/api/logout", "POST");
    } finally {
      clearConsent();
      window.location.href = "/login.html";
    }
  });

  if (requireAuth && !user) {
    window.location.href = "/login.html";
    return { user: null };
  }

  return { user };
}