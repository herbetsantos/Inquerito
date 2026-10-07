document.addEventListener('DOMContentLoaded', () => {
  // 1. VERIFICAÇÃO DE AUTENTICAÇÃO (LGPD & Segurança)
  const token = localStorage.getItem('token_inquerito');
  if (!token) {
    // Redireciona para o login mantendo os parâmetros extraídos do e-SUS na URL
    window.location.href = 'login.html' + window.location.search;
    return;
  }

  // 2. CAPTURA DOS PARÂMETROS ENVIADOS PELA EXTENSÃO (URL)
  const urlParams = new URLSearchParams(window.location.search);
  
  // Mapeamento dos campos do formulário com os parâmetros da URL
  const paramMap = {
    'microarea': 'microarea',
    'acs_nome': 'acs',
    'endereco_pec': 'endereco',
    'responsavel_familiar': 'responsavel',
    'telefone_contato': 'telefone',
    'data_visita_pec': 'dataVisitaPEC'
  };

  Object.entries(paramMap).forEach(([fieldId, paramName]) => {
    const el = document.getElementById(fieldId);
    if (el && urlParams.has(paramName)) {
      el.value = urlParams.get(paramName);
    }
  });

  // 3. DETEÇÃO EM TEMPO REAL DE DIVERGÊNCIA DE VISITAS
  const selectVisitaRelatada = document.getElementById('visita_relatada');
  const badgeDivergencia = document.getElementById('badge-divergencia');
  const dataVisitaPEC = urlParams.get('dataVisitaPEC') || '';

  selectVisitaRelatada.addEventListener('change', (e) => {
    // Avalia se existia registro válido no e-SUS PEC
    const constavaVisitaPEC = dataVisitaPEC.trim() !== '' && 
                             !dataVisitaPEC.toLowerCase().includes('nenhuma') && 
                             !dataVisitaPEC.toLowerCase().includes('não consta');

    // Paciente selecionou "Não" (false)
    const pacienteNegou = e.target.value === 'false';

    // Exibe o alerta se o e-SUS diz que houve visita mas o paciente nega
    if (constavaVisitaPEC && pacienteNegou) {
      badgeDivergencia.classList.remove('hidden');
    } else {
      badgeDivergencia.classList.add('hidden');
    }
  });

  // 4. SUBMISSÃO DO FORMULÁRIO PARA O BACKEND PROTEGIDO
  const formInquerito = document.getElementById('form-inquerito');
  
  formInquerito.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = formInquerito.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = 'A guardar...';

    const payload = {
      microarea: document.getElementById('microarea').value,
      acs_nome: document.getElementById('acs_nome').value,
      endereco_pec: document.getElementById('endereco_pec').value,
      responsavel_familiar: document.getElementById('responsavel_familiar').value,
      telefone_contato: document.getElementById('telefone_contato').value,
      visita_registrada_pec: dataVisitaPEC.trim() !== '' && !dataVisitaPEC.toLowerCase().includes('nenhuma'),
      data_visita_pec: dataVisitaPEC,
      visita_relatada_paciente: selectVisitaRelatada.value === 'true',
      status_ligacao: document.getElementById('status_ligacao').value,
      conhece_agente: document.getElementById('conhece_agente').value === 'true',
      nivel_satisfacao: parseInt(document.getElementById('nivel_satisfacao').value, 10) || 0
    };

    try {
      const res = await fetch('/api/inqueritos', {
        method: 'POST',
        headers: {
          'Content-Type':