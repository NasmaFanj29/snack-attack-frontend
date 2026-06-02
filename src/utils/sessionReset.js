const CHATS_KEY        = 'snack_chats';
const ORDERS_KEY       = 'snack_custom_orders';
const ACTIVE_TABLE_KEY = 'activeTable';
const CART_PREFIX      = 'snackAttackCart';
const CHAT_HISTORY_PREFIX = 'chatHistory_';
const SESSION_FLAG = 'snack_session_active';

function clearCustomerData() {
  localStorage.removeItem(CHATS_KEY);
  localStorage.removeItem(ORDERS_KEY);
  localStorage.removeItem('guestName');
  localStorage.removeItem('guestPhone');

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key === CART_PREFIX ||
      key.startsWith(CART_PREFIX + '_') ||
      key.startsWith(CHAT_HISTORY_PREFIX)
    ) {
      localStorage.removeItem(key);
    }
  }
}

function getTableFromURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('table');
    return t && t.trim() ? String(t).trim() : null;
  } catch {
    return null;
  }
}

export function initSession() {
  const urlTable    = getTableFromURL();
  const storedTable = localStorage.getItem(ACTIVE_TABLE_KEY);
  const sessionLive = sessionStorage.getItem(SESSION_FLAG) === '1';

  const isQRScan     = urlTable !== null;
  const isNewSession = !sessionLive;
  const tableChanged = isQRScan && storedTable !== null && urlTable !== storedTable;

  if (isQRScan || isNewSession || tableChanged) {
    clearCustomerData();
  }

  const resolvedTable = urlTable || storedTable || '1';
  localStorage.setItem(ACTIVE_TABLE_KEY, resolvedTable);
  sessionStorage.setItem(SESSION_FLAG, '1');

  if (isQRScan) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('table');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch {}
  }

  return resolvedTable;
}

export function endSession() {
  clearCustomerData();
  sessionStorage.removeItem(SESSION_FLAG);
}