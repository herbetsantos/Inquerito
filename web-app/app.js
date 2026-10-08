document.addEventListener('DOMContentLoaded', () => {
  // Auto-preenche os campos vindo da URL (Extensão)
  const params = new URLSearchParams(window.location.search);
  
  if (document.getElementById('microarea')) document.getElementById('microarea').value = params.get('microarea') || '';
  if (document.getElementById('acs_nome')) document.getElementById('acs_nome').value = params.get('acs_nome') || '';
  if (document.getElementById('endereco_pec')) document.getElementById('endereco_pec').value = params.get('endereco_pec') || '';
  if (document.getElementById('responsavel_familiar')) document.getElementById('responsavel_familiar').value = params.get('responsavel_familiar') || '';
  if (document.getElementById('telefone_contato')) document.getElementById('telefone_contato').value = params.get('telefone_contato') || '';

  // Form Submissão
  const form = document.getElementById('form-inquerito');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        microarea: document.getElementById('microarea')?.value,
        acs_nome: document.getElementById('acs_nome')?.value,
        endereco_pec: document.getElementById('endereco_pec')?.value,
        responsavel_familiar: document.getElementById('responsavel_familiar')?.value,
        telefone_contato: document.getElementById('telefone_contato')?.value,
        status_ligacao: document.getElementById('status_ligacao')?.value,
        observacoes: document.getElementById('observacoes')?.value
      };

      try {
        const res = await fetch('/api/inqueritos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          alert('Inquérito registrado com sucesso!');
          form.reset();
        } else {
          const err = await res.json();
          alert('Erro ao salvar: ' + (err.error || 'Erro desconhecido'));
        }
      } catch (err) {
        alert('Erro na comunicação com o servidor.');
      }
    });
  }
});