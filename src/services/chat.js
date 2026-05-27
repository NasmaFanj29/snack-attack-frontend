// ═══════════════════════════════════════
// chat.js
// ═══════════════════════════════════════
import axios from './apiClient';

export async function sendChat(messages, menuItems, userMessageCount = 0, extras = []) {
  const limitedMessages = messages.slice(-12).filter(m => m.content?.trim());

  const languageHint = userMessageCount <= 2
    ? 'OVERRIDE: Reply in ENGLISH ONLY for this message, no exceptions.'
    : '';

  let menuContext = '';

  if (Array.isArray(menuItems) && menuItems.length > 0) {
    const byCategory = menuItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(`${item.name} $${Number(item.price).toFixed(2)}`);
      return acc;
    }, {});
    menuContext = `${languageHint}\nMENU:\n` + Object.entries(byCategory)
      .map(([cat, items]) => `${cat}: ${items.join(', ')}`)
      .join('\n');
  } else {
    menuContext = `${languageHint}\nMenu is currently unavailable.`;
  }

  // ✅ Add extras/add-ons to context
  if (Array.isArray(extras) && extras.length > 0) {
    menuContext += `\n\nAVAILABLE EXTRAS & ADD-ONS:\n${extras.map(e => `${e.name} $${Number(e.price).toFixed(2)}`).join(', ')}`;
  }

  const res = await axios.post('/api/ai-chat', {
    messages: limitedMessages,
    menuContext,
  });
  return res.data;
}

export default { sendChat };