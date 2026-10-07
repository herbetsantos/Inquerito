document.getElementById('btnExtrair').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    alert('Nenhuma aba ativa encontrada.');
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      alert('Erro ao injetar script na página.');
      return;
    }

    const dados = (results && results[0] && results[0].result) ? results[0].result : {};

    const params = new URLSearchParams({
      microarea: dados.microarea || '',
      acs_nome: dados.acs_nome || '',
      endereco_pec: dados.endereco_pec || '',
      responsavel_familiar: dados.responsavel_familiar || '',
      telefone_contato: dados.telefone_contato || ''
    });

    const targetUrl = `https://inquerito.pages.dev/index.html?${params.toString()}`;
    chrome.tabs.create({ url: targetUrl });
  });
});