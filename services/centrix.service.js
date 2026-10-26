const env = require("../config/env");

let _token = null;
let _tokenExpiresAt = 0;

async function getAccessToken() {
  if (_token && Date.now() < _tokenExpiresAt) {
    return _token;
  }

  const res = await fetch(`${env.centrix.apiUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.centrix.clientId,
      client_secret: env.centrix.clientSecret,
      scope: env.centrix.scope,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to get Centrix access token");
  }

  const data = await res.json();
  _token = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return _token;
}

async function centrixRequest(method, path, body) {
  const token = await getAccessToken();
  const url = `${env.centrix.apiUrl}${path}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);

  if (res.status === 401) {
    _token = null;
    _tokenExpiresAt = 0;
    const newToken = await getAccessToken();
    options.headers.Authorization = `Bearer ${newToken}`;
    const retryRes = await fetch(url, options);
    if (!retryRes.ok) {
      const err = await retryRes.json().catch(() => ({}));
      throw new Error(err.message || "Centrix API request failed after retry");
    }
    return retryRes.json();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Centrix API request failed");
  }

  return res.json();
}

function normalizePhone(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length === 10) return "+91" + cleaned;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return "+" + cleaned;
  return phone.startsWith("+") ? phone : "+" + cleaned;
}

async function sendMessage({ channel, recipients, content, scheduledAt, title, subject }) {
  const normalizedRecipients = (recipients || []).map(function (r) {
    return { name: r.name, mobileNo: normalizePhone(r.mobileNo), email: r.email || "" };
  });
  return centrixRequest("POST", "/messages/send-direct", {
    channel,
    recipients: normalizedRecipients,
    content,
    scheduledAt: scheduledAt || null,
    subject: subject || title || "Notification",
  });
}

async function sendInvoice(saleData, channel) {
  const storeName = (saleData.Store && saleData.Store.name) || "";
  const customer = saleData.customer || saleData.Customer || {};
  const recipients = (customer.name || customer.phone || customer.email)
    ? [{ name: customer.name || "", mobileNo: customer.phone || "", email: customer.email || "" }]
    : [];

  const invoiceMessage = [
    `Invoice #${saleData.invoice_number || saleData.id}`,
    `Amount: \u20B9${parseFloat(saleData.total_amount || saleData.grand_total || 0).toFixed(2)}`,
    `Date: ${new Date().toLocaleDateString("en-IN")}`,
    `Store: ${storeName}`,
    "",
    "Thank you for your purchase!",
  ].join("\n");

  return sendMessage({
    channel,
    recipients,
    content: invoiceMessage,
    title: `Invoice #${saleData.invoice_number || saleData.id}`,
    subject: `Invoice from ${storeName || "MySkin"}`,
  });
}

function clearToken() {
  _token = null;
  _tokenExpiresAt = 0;
}

module.exports = {
  getAccessToken,
  sendMessage,
  sendInvoice,
  clearToken,
};
