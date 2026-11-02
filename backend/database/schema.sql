-- Esquema SQLite (somente estrutura). O servidor também o cria sozinho na primeira execução.
CREATE TABLE IF NOT EXISTS tests(
      id TEXT PRIMARY KEY, token_hash TEXT NOT NULL,
      criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL, concluido_em TEXT,
      nome TEXT NOT NULL, idade INTEGER NOT NULL, email TEXT NOT NULL,
      cursos_json TEXT NOT NULL, consent_json TEXT NOT NULL, ip_hash TEXT, ua TEXT,
      progresso INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'iniciado',
      respostas_json TEXT, ordem_json TEXT, resultado_json TEXT,
      confiab_nivel TEXT, confiab_score INTEGER, top3_json TEXT,
      n_citados INTEGER, melhor_pos INTEGER, hit_top3 INTEGER, hit_top10 INTEGER, tempo_total_ms INTEGER,
      email_status TEXT NOT NULL DEFAULT 'pendente', email_enviado_em TEXT, email_erro TEXT, email_tentativas INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS ix_tests_criado ON tests(criado_em);
CREATE INDEX IF NOT EXISTS ix_tests_ip ON tests(ip_hash, criado_em);
CREATE INDEX IF NOT EXISTS ix_tests_email ON tests(email, criado_em);
CREATE TABLE IF NOT EXISTS login_failures(ip_hash TEXT, ts REAL);
    
