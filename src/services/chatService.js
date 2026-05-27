// ═══════════════════════════════════════
// chatService.js
// ═══════════════════════════════════════
import { sendChat } from './chat';

async function wrap(fn, ...args) {
  try {
    const data = await fn(...args);
    return { success: true, data, error: null };
  } catch (err) {
    const message =
      err?.message ||
      (err?.response?.data && (err.response.data.error || err.response.data.message)) ||
      'API error';
    return { success: false, data: null, error: message, retry: () => fn(...args) };
  }
}

const sendChatMsg = (messages, menuItems, userMessageCount, extras) =>
  wrap(sendChat, messages, menuItems, userMessageCount, extras);

const chatService = { sendChat: sendChatMsg };
export default chatService;