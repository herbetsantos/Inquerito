document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  const irParaLogin = () => { window.location.replace('index.html' + window.location.hash); };

  // Sessão é um cookie HttpOnly: o JavaScript não lê o token, apenas pergunta ao servidor quem somos.
  let eu;
  try {
    const r = await fetch('/api/me');
    if (!r.ok) return irParaLogin();
    eu = await r.json();
  } catch { return irParaLogin(); }

  if (['admin', 'gestor', 'auditor'].includes(eu.perfil) && $('lnk-dashboard')) $('lnk-dashboard').classList.remove('hidden');
  if (eu.perfil === 'admin' && $('lnk-admin')) $('lnk-admin').classList.remove('hidden');

  $('btn-logout')?.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    window.location.href = 'index.html';
  });

  // Preenche os campos vindos da extensão (fragmento #...), depois apaga da barra de endereço
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  ['microarea', 'acs_nome', 'endereco_pec', 'responsavel_familiar', 'telefone_contato']
    .forEach((c) => { if ($(c)) $(c).value = params.get(c) || ''; });
  if (window.location.hash) history.replaceState(null, '', window.location.pathname);

  const campos = ['microarea', 'acs_nome', 'endereco_pec', 'responsavel_familiar', 'telefone_contato',
    'status_ligacao', 'visita_registrada_pec', 'data_visita_pec', 'visita_relatada_paciente',
    'conhece_agente', 'nivel_satisfacao', 'observacoes'];

  $('form-inquerito')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(campos.map((c) => [c, $(c)?.value ?? '']));
    try {
      const res = await fetch('/api/inqueritos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { alert('Sessão expirada. Faça login novamente.'); return irParaLogin(); }
      if (res.ok) {
        alert('Inquérito registrado com sucesso!');
        $('form-inquerito').reset();
      } else {
        alert('Erro ao salvar: ' + (data.mensagem || `HTTP ${res.status}`));
      }
    } catch {
      alert('Erro na comunicação com o servidor.');
    }
  });
});
