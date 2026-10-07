-- Tabela de Usuários (Acesso Entrevistador vs Gestão)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('entrevistador', 'gestao')),
    senha_hash VARCHAR(255) NOT NULL
);

-- Tabela Principal de Inquéritos Telefônicos
CREATE TABLE inqueritos (
    id SERIAL PRIMARY KEY,
    data_entrevista TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    entrevistador_id INT REFERENCES usuarios(id),
    
    -- Dados Extraídos do e-SUS PEC via Extensão
    unidade_saude VARCHAR(100),
    microarea VARCHAR(20),
    acs_nome VARCHAR(100),
    endereco_pec TEXT NOT NULL,
    responsavel_familiar VARCHAR(100),
    telefone_contato VARCHAR(30),
    
    -- Dados de Auditoria do e-SUS
    visita_registrada_pec BOOLEAN,
    data_visita_pec DATE,
    
    -- Dados Coletados no Inquérito Telefônico
    status_ligacao VARCHAR(30) CHECK (status_ligacao IN ('Concluída', 'Não atendeu', 'Número inválido', 'Recusou', 'Não reside')),
    visita_relatada_paciente BOOLEAN,
    conhece_agente BOOLEAN,
    nome_agente_confere BOOLEAN,
    nivel_satisfacao INT CHECK (nivel_satisfacao BETWEEN 0 AND 10),
    
    -- Sinalizador de Divergência Calculado
    possui_divergencia BOOLEAN GENERATED ALWAYS AS (
        CASE 
            WHEN visita_registrada_pec = TRUE AND visita_relatada_paciente = FALSE THEN TRUE
            ELSE FALSE
        END
    ) STORED
);