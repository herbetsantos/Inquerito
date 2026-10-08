export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { email, senha } = await request.json();

    // Consulta o usuário no banco D1
    const { results } = await env.DB.prepare(
      'SELECT * FROM usuarios WHERE email = ?'
    ).bind(email).all();

    const usuario = results[0];

    // Validação básica (para testes/homologação)
    if (!usuario || usuario.senha_hash !== senha) {
      return new Response(
        JSON.stringify({ mensagem: 'Credenciais inválidas' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Retorna os dados do usuário e o token
    return new Response(JSON.stringify({
      token: env.JWT_SECRET, // Utiliza a variável vinculada
      perfil: usuario.perfil,
      nome: usuario.nome
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ mensagem: 'Erro interno no servidor', detalhes: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}