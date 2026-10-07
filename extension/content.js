// ==========================================================================
// 1. Função de Extração de Dados do e-SUS PEC
// ==========================================================================
function extrairDadosPEC() {
  // Ajuste os seletores conforme os IDs/classes reais presentes no seu e-SUS PEC
  const extrairTexto = (seletor) => {
    const el = document.querySelector(seletor);
    return el ? el.innerText.trim() : '';
  };

  return {
    microarea: extrairTexto('#microarea, .microarea-val, [data-microarea]') || '',
    acs_nome: extrairTexto('#nome-acs, .acs-nome-val') || '',
    endereco_pec: extrairTexto('#endereco, .endereco-val') || '',
    responsavel_familiar: extrairTexto('#responsavel, .responsavel-val') || '',
    telefone_contato: extrairTexto('#telefone, .telefone-val') || ''
  };
}

// ==========================================================================
// 2. Injeção e Estilização do Botão Flutuante (Visual eMulti / e-SUS)
// ==========================================================================
function injetarBotaoFlutuante() {
  if (document.getElementById('btn-inquerito-esus')) return;

  const floatBtn = document.createElement('button');
  floatBtn.id = 'btn-inquerito-esus';
  floatBtn.innerHTML = '📞 Iniciar Inquérito';

  // Estilização isolada (evita conflito com o CSS nativo do PEC)
  Object.assign(floatBtn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  });

  // Efeitos visuais de interação
  floatBtn.addEventListener('mouseenter', () => {
    floatBtn.style.backgroundColor = '#0369a1';
    floatBtn.style.transform = 'translateY(-2px)';
    floatBtn.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  });

  floatBtn.addEventListener('mouseleave', () => {
    floatBtn.style.backgroundColor = '#0284c7';
    floatBtn.style.transform = 'translateY(0)';
    floatBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  // Ação ao clicar: captura os dados e abre o Web-App no Cloudflare Pages
  floatBtn.addEventListener('click', () => {
    const dados = extrairDadosPEC();
    const params = new URLSearchParams(dados).toString();
    const urlWebApp = `https://inquerito.pages.dev/index.html?${params}`;

    window.open(urlWebApp, '_blank');
  });

  document.body.appendChild(floatBtn);
}

// ==========================================================================
// 3. Execução Contínua / Monitoramento da DOM
// ==========================================================================
// Executa na carga inicial
injetarBotaoFlutuante();

// O e-SUS utiliza navegação dinâmica (SPA/AJAX). O Observer garante que o botão
// permaneça visível mesmo ao mudar de tela/paciente sem recarregar a página.
const observer = new MutationObserver(() => {
  injetarBotaoFlutuante();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});