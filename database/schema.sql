-- 1. Tabela de Profissionais / Utilizadores com Perfis (RBAC)
CREATE TABLE IF NOT EXISTS profissionais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL DEFAULT 'operador', -- 'admin', 'operador', 'auditor'
    cnes VARCHAR(20),
    equipe VARCHAR(50),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Inquéritos / Questionários Aplicados
CREATE TABLE IF NOT EXISTS inqueritos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profissional_id INTEGER NOT NULL,
    microarea VARCHAR(10),
    acs_nome VARCHAR(100),
    endereco_pec TEXT,
    responsavel_familiar VARCHAR(100),
    telefone_contato VARCHAR(20),
    status_ligacao VARCHAR(30) NOT NULL, -- 'sucesso', 'recusado', 'nao_atendeu', etc.
    observacoes TEXT,
    data_aplicacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
);

-- Indexação para consultas rápidas por CPF e Perfil
CREATE INDEX IF NOT EXISTS idx_profissionais_cpf ON profissionais(cpf);
CREATE INDEX IF NOT EXISTS idx_inqueritos_profissional ON inqueritos(profissional_id);