import { json, exigirPermissao } from '../../_lib/auth.js';

// Endpoint administrativo protegido: não expõe senha_hash nem outros segredos.
export async function onRequestGet({ request, env }) {
  const { erro } = await exigirPermissao(request, env, 'usuarios.visualizar');
  if (erro) return erro;

  try {
    const { results } = await env.DB.prepare(`
      SELECT id, cpf, nome, perfil, cnes, equipe, ativo, criado_em
      FROM profissionais
      ORDER BY nome`).all();

    return json({ profissionais: results });
  } catch (err) {
    console.error('admin profissionais:', err);
    return json({ mensagem: 'Erro ao consultar usuários.' }, 500);
  }
}
