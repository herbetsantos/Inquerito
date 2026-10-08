document.addEventListener('DOMContentLoaded', () => {
  // 1. Processamento do Login (index.html)
  const loginForm = document.getElementById('login-form') || document.querySelector('form');
  const cpfInput = document.getElementById('cpf');
  const senhaInput = document.getElementById('senha');

  if (loginForm && cpfInput && senhaInput) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cpf: cpfInput.value.trim(),
            senha: senhaInput.value.trim()
          })
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          alert('Login efetuado com sucesso!');
          window.location.href = '/dashboard.html';
        } else {
          alert('Erro de Autenticação: ' + (data.error || 'Credenciais inválidas'));
        }
      } catch (err) {
        alert('Erro ao conectar ao servidor.');
      }
    });
  }

  // 2. Preenchimento Automático vindo da Extensão (URL Parameters)
  const params = new URLSearchParams(window.location.search);
  const setField = (id, paramName) => {
    const el = document.getElementById(id);
    if (el && params.has(paramName)) {
      el.value = params.get(paramName);
    }
  };

  setField('microarea', 'microarea');
  setField('acs_nome', 'acs_nome');
  setField('endereco_pec', 'endereco_pec');
  setField('responsavel_familiar', 'responsavel_familiar');
  setField('telefone_contato', 'telefone_contato');

  // 3. Submissão do Formulário de Inquérito
  const inqueritoForm = document.getElementById('form-inquerito');
  if (inqueritoForm) {
    inqueritoForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        microarea: document.getElementById('microarea')?.value || '',
        acs_nome: document.getElementById('acs_nome')?.value || '',
        endereco_pec: document.getElementById('endereco_pec')?.value || '',
        responsavel_familiar: document.getElementById('responsavel_familiar')?.value || '',
        telefone_contato: document.getElementById('telefone_contato')?.value || '',
        status_ligacao: document.getElementById('status_ligacao')?.value || '',
        observacoes: document.getElementById('observacoes')?.value || ''
      };

      try {
        const res = await fetch('/api/inqueritos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          alert('Inquérito registado com sucesso!');
          inqueritoForm.reset();
        } else {
          const err = await res.json();
          alert('Erro ao guardar: ' + (err.error || 'Erro desconhecido'));
        }
      } catch (err) {
        alert('Erro ao comunicar com o servidor.');
      }
    });
  }
});