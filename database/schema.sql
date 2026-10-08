CREATE TABLE IF NOT EXISTS profissionais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cpf TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    perfil TEXT NOT NULL DEFAULT 'operador' CHECK (perfil IN ('admin','operador','auditor','gestor')),
    cnes TEXT,
    equipe TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inqueritos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profissional_id INTEGER,
    microarea TEXT,
    acs_nome TEXT,
    endereco_pec TEXT,
    responsavel_familiar TEXT,
    telefone_contato TEXT,
    visita_registrada_pec INTEGER,      -- 1 = e-SUS registra visita
    data_visita_pec TEXT,               -- AAAA-MM-DD
    visita_relatada_paciente INTEGER,   -- 1 = paciente confirma a visita
    status_ligacao TEXT NOT NULL,
    conhece_agente INTEGER,
    nivel_satisfacao INTEGER CHECK (nivel_satisfacao IS NULL OR nivel_satisfacao BETWEEN 0 AND 10),
    observacoes TEXT,
    data_aplicacao TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
);

CREATE INDEX IF NOT EXISTS idx_inqueritos_profissional ON inqueritos(profissional_id);
CREATE INDEX IF NOT EXISTS idx_inqueritos_acs ON inqueritos(acs_nome);

-- Controle de tentativas de login (limite por CPF + IP)
CREATE TABLE IF NOT EXISTS login_falhas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cpf TEXT NOT NULL,
    ip TEXT NOT NULL,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_falhas ON login_falhas(cpf, ip, criado_em);
