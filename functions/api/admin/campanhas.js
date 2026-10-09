import { json, exigirPermissao } from '../../_lib/auth.js';

const txt = (v, max) => v == null || v === '' ? null : String(v).trim().slice(0, max);

export async function onRequestGet({ request, env }) {
  const { erro } = await exigirPermissao(request, env, 'usuarios.visualizar');
  if (erro) return erro;
  const { results } = await env.DB.prepare(`
    SELECT c.id, c.nome, c.unidade, c.status, c.criado_em, p.nome AS criado_por_nome,
           (SELECT COUNT(*) FROM campanha_mailing m WHERE m.campanha_id = c.id) AS total,
           (SELECT COUNT(*) FROM campanha_mailing m WHERE m.campanha_id = c.id AND m.status='concluido') AS concluidos,
           (SELECT COUNT(*) FROM campanha_mailing m WHERE m.campanha_id = c.id AND m.status='pendente') AS pendentes
    FROM campanhas c
    LEFT JOIN profissionais p ON p.id = c.criado_por
    ORDER BY c.id DESC
  `).all();
  return json({ campanhas: results });
}

export async function onRequestPost({ request, env }) {
  const { usuario, erro } = await exigirPermissao(request, env, 'usuarios.gerenciar');
  if (erro) return erro;
  const body = await request.json().catch(() => null);
  if (!body) return json({ mensagem: 'JSON inválido.' }, 400);
  const nome = txt(body.nome, 160);
  const unidade = txt(body.unidade, 160);
  const composicao = body.composicao && typeof body.composicao === 'object' ? body.composicao : null;
  if (!nome) return json({ mensagem: 'Nome da campanha é obrigatório.' }, 400);
  if (!composicao || !Array.isArray(composicao.selecoes)) return json({ mensagem: 'Composição territorial inválida.' }, 400);
  const result = await env.DB.prepare(`
    INSERT INTO campanhas (nome, unidade, composicao_json, criado_por)
    VALUES (?, ?, ?, ?)
  `).bind(nome, unidade, JSON.stringify(composicao), usuario.id).run();
  return json({ id: result.meta?.last_row_id, mensagem: 'Campanha criada com sucesso.' }, 201);
}

// Exclusão de campanha e de todo o seu mailing (dados pessoais: nome, CNS, CPF, telefone, endereço).
// Os inquéritos já registrados são preservados; apenas o vínculo (mailing_id) é desfeito.
// Se houver inquéritos vinculados, exige confirmação explícita (forcar=true).
export async function onRequestDelete({ request, env }) {
  const { usuario, erro } = await exigirPermissao(request, env, 'usuarios.gerenciar');
  if (erro) return erro;
  const u = new URL(request.url);
  const id = Number(u.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return json({ mensagem: 'Campanha inválida.' }, 400);
  const forcar = u.searchParams.get('forcar') === 'true';

  const camp = await env.DB.prepare('SELECT id, nome FROM campanhas WHERE id = ?').bind(id).first();
  if (!camp) return json({ mensagem: 'Campanha não encontrada.' }, 404);

  const vinc = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM inqueritos WHERE mailing_id IN (SELECT id FROM campanha_mailing WHERE campanha_id = ?)'
  ).bind(id).first();
  const vinculados = vinc?.n || 0;
  if (vinculados > 0 && !forcar) {
    return json({
      mensagem: `A campanha possui ${vinculados} inquérito(s) vinculado(s). Confirme para excluir o mailing e manter os inquéritos sem vínculo com o contato.`,
      requer_confirmacao: true,
      inqueritos_vinculados: vinculados
    }, 409);
  }

  // Operação atômica: desvincula inquéritos, remove mailing e campanha.
  await env.DB.batch([
    env.DB.prepare('UPDATE inqueritos SET mailing_id = NULL WHERE mailing_id IN (SELECT id FROM campanha_mailing WHERE campanha_id = ?)').bind(id),
    env.DB.prepare('DELETE FROM campanha_mailing WHERE campanha_id = ?').bind(id),
    env.DB.prepare('DELETE FROM campanhas WHERE id = ?').bind(id)
  ]);
  console.log(`campanha ${id} (${camp.nome}) excluída por usuário ${usuario.id}`);
  return json({ mensagem: 'Campanha e mailing excluídos.', inqueritos_desvinculados: vinculados });
}
