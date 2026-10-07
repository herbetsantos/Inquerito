document.getElementById('btn-extrair').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  statusDiv.innerText = 'Extraindo dados...';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    statusDiv.innerText = 'Erro: Nenhuma aba ativa.';
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: 'EXTRAIR_DADOS' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.sucesso) {
      statusDiv.innerText = 'Navegue até a página de detalhes do imóvel no e-SUS PEC.';
      return;
    }

    const d = response.dados;
    const params = new URLSearchParams({
      endereco: d.endereco,
      microarea: d.microarea,
      telefone: d.telefone,
      acs: d.acsNome,
      responsavel: d.responsavelFamiliar,
      dataVisitaPEC: d.dataVisitaPEC,
      desfechoPEC: d.desfechoPEC
    });

    // Redireciona para o Web App hospedado preenchendo a URL
    const appUrl = `https://inquerito-acs.pages.dev/index.html?${params.toString()}`;
    chrome.tabs.create({ url: appUrl });
  });
});