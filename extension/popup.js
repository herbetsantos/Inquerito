// Endereço do web-app publicado no Cloudflare Pages
const URL_WEBAPP = 'https://inquerito.pages.dev/';

// Executada DENTRO da página do e-SUS PEC (somente quando o usuário clica no botão).
// Ajuste os seletores conforme os IDs/classes reais da sua tela do PEC.
function extrairDadosPEC() {
  const t = (seletor) => {
    const el = document.querySelector(seletor);
    return el ? el.innerText.trim() : '';
  };
  return {
    microarea: t('#microarea, .microarea-val, [data-microarea]'),
    acs_nome: t('#nome-acs, .acs-nome-val'),
    endereco_pec: t('#endereco, .endereco-val'),
    responsavel_familiar: t('#responsavel, .responsavel-val'),
    telefone_contato: t('#telefone, .telefone-val')
  };
}

document.getElementById('btnExtrair').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) { alert('Nenhuma aba ativa encontrada.'); return; }

  let dados = {};
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extrairDadosPEC });
    dados = (res && res.result) || {};
  } catch (err) {
    console.error(err);
    alert('Não foi possível ler esta página.');
    return;
  }

  // Dados pessoais vão no FRAGMENTO (#): não são enviados ao servidor, nem em logs ou Referer.
  const fragmento = new URLSearchParams(dados).toString();
  chrome.tabs.create({ url: `${URL_WEBAPP}index.html#${fragmento}` });
});
