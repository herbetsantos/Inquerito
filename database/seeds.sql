-- Utilizadores para teste local
-- Nota: A palavra-passe original nestes hashes de exemplo é "123456"
INSERT OR IGNORE INTO profissionais (cpf, nome, senha_hash, perfil, cnes) 
VALUES 
('11122233344', 'Gestor eMulti', '$2a$10$vI8aWBnW3fID.ZQ4/p1G7.2gMIs1RkO5mC4oFp3bL6.1XN2h2', 'admin', '1234567'),
('55566677788', 'Operador ACS', '$2a$10$vI8aWBnW3fID.ZQ4/p1G7.2gMIs1RkO5mC4oFp3bL6.1XN2h2', 'operador', '1234567');