import { json, exigirAuth } from '../_lib/auth.js';

const STATUS_VALIDOS = ['atendeu', 'nao_atendeu', 'numero_invalido', 'recusou', 'caixa_postal'];
const txt = (v, max) => (v == null || v === '' ? null : String(v).trim().slice(0, max));

export async function onRequestPost({ request, env }) {
  const { usuario, erro } = await exigirAuth(request, env);
  if (erro) return erro;

  try {
    const d = await request.json().catch(() => null);
    if (!d) return json({ mensagem: 'JSON inválido.' }, 400);
    if (!STATUS_VALIDOS.includes(d.status_ligacao)) {
      return json({ mensagem: 'Status da ligação inválido.' }, 400);
    }
    const satisf = d.nivel_satisfacao === '' || d.nivel_satisfacao == null ? null : Number(d.nivel_satisfacao);
    if (satisf !== null && !(Number.isInteger(satisf) && satisf >= 0 && satisf <= 10)) {
      return json({ mensagem: 'Nível de satisfação deve ser um inteiro de 0 a 10.' }, 400);
    }
    const tri = (v) => (v === true || v === 'true' || v === 1 || v === '1' ? 1 : v === false || v === 'false' || v === 0 || v === '0' ? 0 : null);

    await env.DB.prepare(`
      INSERT INTO inqueritos (
        profissional_id, microarea, acs_nome, endereco_pec, responsavel_familiar,
        telefone_contato, visita_registrada_pec, data_visita_pec, visita_relatada_paciente,
        status_ligacao, conhece_agente, nivel_satisfacao, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      usuario.id,
      txt(d.microarea, 10), txt(d.acs_nome, 100), txt(d.endereco_pec, 500),
      txt(d.responsavel_familiar, 100), txt(d.telefone_contato, 20),
      tri(d.visita_registrada_pec), txt(d.data_visita_pec, 10), tri(d.visita_relatada_paciente),
      d.status_ligacao, tri(d.conhece_agente), satisf, txt(d.observacoes, 2000)
    ).run();

    return json({ mensagem: 'Inquérito gravado com sucesso!' }, 201);
  } catch (err) {
    console.error('inqueritos:', err);
    return json({ mensagem: 'Erro ao salvar inquérito.' }, 500);
  }
}
