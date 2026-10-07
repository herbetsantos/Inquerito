// Função para extrair informações do Imóvel (Aba Informações)
function extrairDadosImovel() {
  const endereco = document.querySelector('h1.css-1vh10zg')?.innerText || '';
  
  // Captura da Microárea
  let microarea = '';
  document.querySelectorAll('p.css-0').forEach(p => {
    if (p.innerText.includes('Microárea')) {
      microarea = p.querySelector('.css-feas39')?.innerText || '';
    }
  });

  // Captura do Telefone de Contato
  let telefone = '';
  document.querySelectorAll('p.css-0').forEach(p => {
    if (p.innerText.includes('Telefone de contato') || p.innerText.includes('Telefone residencial')) {
      const telText = p.querySelector('.css-feas39')?.innerText || '';
      if (telText && !telefone) telefone = telText;
    }
  });

  // Captura do ACS Responsável
  const acsNome = document.querySelector('.css-qdlg5k .css-ttodl9')?.innerText || '';

  return { endereco, microarea, telefone, acsNome };
}

// Função para extrair Responsável Familiar (Aba Famílias)
function extrairResponsavelFamiliar() {
  const respElem = document.querySelector('.css-1p0w3oq .css-11eu3tl .css-ttodl9');
  return respElem ? respElem.innerText : '';
}

// Função para extrair Última Visita (Aba Últimas Visitas)
function extrairUltimaVisitaPEC() {
  const primeiraLinhaVisita = document.querySelector('.accordion__item');
  if (!primeiraLinhaVisita) return null;

  const dataVisita = primeiraLinhaVisita.querySelector('[name="dataVisita"] time')?.innerText || '';
  const desfecho = primeiraLinhaVisita.querySelector('[name="desfecho"] span')?.innerText || '';

  return { dataVisita, desfecho };
}

// Escuta mensagens do popup da extensão
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRAIR_DADOS') {
    const imovel = extrairDadosImovel();
    const responsavel = extrairResponsavelFamiliar();
    const visita = extrairUltimaVisitaPEC();

    sendResponse({
      sucesso: true,
      dados: {
        endereco: imovel.endereco,
        microarea: imovel.microarea,
        telefone: imovel.telefone,
        acsNome: imovel.acsNome,
        responsavelFamiliar: responsavel,
        dataVisitaPEC: visita ? visita.dataVisita : 'Nenhuma visita registrada',
        desfechoPEC: visita ? visita.desfecho : ''
      }
    });
  }
});