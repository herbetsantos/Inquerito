
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'SAVE_MAILING') {
    chrome.storage.local.set({ mailing: { savedAt: new Date().toISOString(), itens: Array.isArray(msg.itens) ? msg.itens : [], contexto: msg.contexto || {} } })
      .then(() => sendResponse({ ok: true, total: msg.itens?.length || 0 }))
      .catch(err => sendResponse({ ok: false, mensagem: err.message }));
    return true;
  }
  if (msg?.type === 'GET_MAILING') {
    chrome.storage.local.get('mailing')
      .then(data => sendResponse({ ok: true, mailing: data.mailing || null }))
      .catch(err => sendResponse({ ok: false, mensagem: err.message }));
    return true;
  }
  if (msg?.type === 'CLEAR_MAILING') {
    chrome.storage.local.remove('mailing').then(() => sendResponse({ ok:true })).catch(err => sendResponse({ok:false,mensagem:err.message}));
    return true;
  }
});
