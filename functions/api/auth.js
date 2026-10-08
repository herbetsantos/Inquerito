export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { cpf, senha } = body;

    if (!cpf || !senha) {
      return new Response(JSON.stringify({ error: 'CPF e senha são obrigatórios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Banco de dados D1 não vinculado corretamente.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Consulta no D1
    const stmt = env.DB.prepare('SELECT * FROM profissionais WHERE cpf = ? AND ativo = 1');
    const user = await stmt.bind(cpf).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Credenciais inválidas.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tokenData = {
      id: user.id,
      cpf: user.cpf,
      nome: user.nome,
      perfil: user.perfil || 'operador'
    };

    return new Response(JSON.stringify({
      message: 'Login realizado com sucesso',
      token: btoa(JSON.stringify(tokenData)),
      user: tokenData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro no servidor', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}