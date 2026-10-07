export async function onRequestPost(context) {
  const { request, env } = context;

  // Validação simples de autorização pelo Header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.includes(env.JWT_SECRET)) {
    return new Response(
      JSON.stringify({ mensagem: 'Não autorizado' }), 
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const data = await request.json();

    // Insere os registros no D1 SQL
    await env.DB.prepare(`
      INSERT INTO inqueritos (
        microarea, acs_nome, endereco_pec, responsavel_familiar, 
        telefone_contato, visita_registrada_pec, data_visita_pec, 
        visita_relatada_paciente, status_ligacao, conhece_agente, nivel_satisfacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.microarea,
      data.acs_nome,
      data.endereco_pec,
      data.responsavel_familiar,
      data.telefone_contato,
      data.visita_registrada_pec ? 1 : 0,
      data.data_visita_pec,
      data.visita_relatada_paciente ? 1 : 0,
      data.status_ligacao,
      data.conhece_agente ? 1 : 0,
      data.nivel_satisfacao
    ).run();

    return new Response(
      JSON.stringify({ mensagem: 'Inquérito gravado com sucesso!' }), 
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ mensagem: 'Erro ao salvar inquérito', detalhes: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}