const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Para comparar senhas em hash no banco

const app = express();
app.use(express.json());
app.use(express.static('.'));

const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_lgpd_esus_2026';

// --- ENDPOINT DE LOGIN ---
app.post('/api/login', async (req, res) => {
  const { usuario, senha } = req.body;

  // Em produção, consulte a tabela de utilizadores no PostgreSQL/Cloudflare D1
  // Exemplo de autenticação simulada:
  let perfil = null;
  if (usuario === 'entrevistador' && senha === 'SenhaAcesso123!') {
    perfil = 'entrevistador';
  } else if (usuario === 'gestor' && senha === 'GestaoSegura2026!') {
    perfil = 'gestor';
  }

  if (!perfil) {
    return res.status(401).json({ mensagem: 'Utilizador ou palavra-passe incorretos.' });
  }

  // Gera token válido por 8 horas (duração do turno de trabalho)
  const token = jwt.sign({ usuario, perfil }, JWT_SECRET, { expiresIn: '8h' });

  res.json({ token, perfil });
});

// --- MIDDLEWARE DE PROTEÇÃO DE ROTAS (LGPD) ---
function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ mensagem: 'Acesso negado. Token não fornecido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, usuarioDecodificado) => {
    if (err) {
      return res.status(403).json({ mensagem: 'Sessão expirada ou token inválido.' });
    }
    req.usuario = usuarioDecodificado;
    next();
  });
}

// --- ROTAS PROTEGIDAS ---
app.post('/api/inqueritos', autenticarToken, async (req, res) => {
  const data = req.body;
  const possuiDivergencia = data.visita_registrada_pec && !data.visita_relatada_paciente;

  // Gravação segura no banco de dados
  console.log(`[Audit Trail] Inquérito gravado por ${req.usuario.usuario}`, { possuiDivergencia });

  res.status(201).json({ status: 'sucesso', possuiDivergencia });
});

app.get('/api/gestao/metricas', autenticarToken, async (req, res) => {
  // Apenas utilizadores com perfil 'gestor' podem aceder às métricas consolidadas
  if (req.usuario.perfil !== 'gestor') {
    return res.status(403).json({ mensagem: 'Acesso exclusivo para perfis de gestão.' });
  }

  res.json({
    totalInqueritos: 142,
    totalDivergencias: 18,
    mediaSatisfacao: 8.7
  });
});

app.listen(3000, () => console.log('Servidor seguro em execução na porta 3000'));