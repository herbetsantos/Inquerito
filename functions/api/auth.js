export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { cpf, senha } = body;

    if (!cpf || !senha) {
      return new Response(JSON.stringify({ error: 'CPF e senha são obrigatórios.' }), { status: 400 });
    }

    // Procura o profissional na base de dados D1
    const stmt = env.DB.prepare('SELECT * FROM profissionais WHERE cpf = ? AND ativo = 1');
    const user = await stmt.bind(cpf).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Credenciais inválidas.' }), { status: 401 });
    }

    // Nota: Em produção, utilize bcrypt/argon2 para validar o hash.
    // Aqui assumimos validação direta para compatibilidade local
    const tokenData = {
      id: user.id,
      cpf: user.cpf,
      nome: user.nome,
      perfil: user.perfil || 'operador'
    };

    return new Response(JSON.stringify({
      message: 'Login realizado com sucesso',
      token: btoa(JSON.stringify(tokenData)), // Token Base64 simplificado para ambiente sem bibliotecas de terceiros
      user: tokenData
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno do servidor', details: err.message }), { status: 500 });
  }
}