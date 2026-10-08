(() => {
  // Função de extração de dados
  const extrairDados = () => {
    const obterTexto = (seletor) => {
      const el = document.querySelector(seletor);
      return el ? el.innerText.trim() : '';
    };

    return {
      microarea: obterTexto('.campo-microarea, #microarea, [data-microarea]'),
      acs_nome: obterTexto('.campo-acs, #nomeAcs, [data-acs]'),
      endereco_pec: obterTexto('.campo-endereco, #endereco, [data-endereco]'),
      responsavel_familiar: obterTexto('.campo-responsavel, #responsavel, [data-responsavel]'),
      telefone_contato: obterTexto('.campo-telefone, #telefone, [data-telefone]')
    };
  };

  // Injeta o botão flutuante contínuo na tela se ele ainda não existir
  if (!document.getElementById('btn-inquerito-sus')) {
    const btn = document.createElement('button');
    btn.id = 'btn-inquerito-sus';
    btn.innerHTML = '📞 Iniciar Inquérito';

    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '999999',
      padding: '12px 20px',
      backgroundColor: '#0284c7',
      color: '#ffffff',
      border: 'none',
      borderRadius: '25px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      fontWeight: 'bold',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'transform 0.2s, background-color 0.2s'
    });

    btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';

    btn.onclick = () => {
      const dados = extrairDados();
      const params = new URLSearchParams({
        microarea: dados.microarea || '',
        acs_nome: dados.acs_nome || '',
        endereco_pec: dados.endereco_pec || '',
        responsavel_familiar: dados.responsavel_familiar || '',
        telefone_contato: dados.telefone_contato || ''
      });

      const appUrl = `https://inquerito.pages.dev/index.html?${params.toString()}`;
      window.open(appUrl, '_blank');
    };

    document.body.appendChild(btn);
  }

  // Retorna os dados capturados para o popup.js caso seja acionado via botão da extensão
  return extrairDados();
})();