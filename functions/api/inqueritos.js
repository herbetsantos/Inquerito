export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Binding do D1 não configurado.' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const stmt = env.DB.prepare(`
      INSERT INTO inqueritos (
        microarea, acs_nome, endereco_pec, responsavel_familiar, 
        telefone_contato, status_ligacao, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.bind(
      data.microarea || '',
      data.acs_nome || '',
      data.endereco_pec || '',
      data.responsavel_familiar || '',
      data.telefone_contato || '',
      data.status_ligacao || 'Não atendeu',
      data.observacoes || ''
    ).run();

    return new Response(JSON.stringify({ message: 'Inquérito gravado com sucesso!' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro ao salvar inquérito', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestGet(context) {
  try {
    const { env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Binding do D1 não configurado.' }), { status: 500 });
    }

    const { results } = await env.DB.prepare('SELECT * FROM inqueritos ORDER BY data_aplicacao DESC').all();
    
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}