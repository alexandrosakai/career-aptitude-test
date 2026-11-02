# 🧭 career-aptitude-test

**Teste vocacional online com resultado calculado no servidor, relatório por e-mail e painel administrativo.**

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?logo=flask&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

O participante responde a um questionário sobre personalidade, motivações e contexto, e recebe uma lista de cursos compatíveis. O cálculo roda no servidor, então o gabarito não fica exposto no navegador.

## ✨ Funcionalidades

- **Questionário em etapas** com salvamento do progresso (retome de onde parou)
- **Dimensões avaliadas**: personalidade (Big Five), motivadores e contexto
- **Ranking de cursos** e indicador de **confiabilidade** das respostas
- **Relatório do resultado** e envio de cópia por e-mail (SMTP opcional)
- **Painel administrativo** com resumo, lista de testes, reenvio de e-mail e **exportação CSV/JSON**
- **Privacidade**: consentimento registrado, IP guardado só como hash e página de política de privacidade
- **Proteções**: limite de testes por IP e por e-mail, e bloqueio após tentativas de login incorretas

## 🧰 Tecnologias

![Flask](https://img.shields.io/badge/Flask-000000?logo=flask&logoColor=white)
![Gunicorn](https://img.shields.io/badge/Gunicorn-499848?logo=gunicorn&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![nginx](https://img.shields.io/badge/nginx-009639?logo=nginx&logoColor=white)

Python · Flask · Gunicorn · Node.js (motor de cálculo) · SQLite · JavaScript puro no frontend · nginx

## 📋 Requisitos

- **Com Docker:** Docker e Docker Compose v2
- **Sem Docker:** Python 3.10+, Node.js 18+, nginx (ou outro servidor para o frontend)

## 🚀 Instalação

### Com Docker (recomendado)

```bash
git clone https://github.com/alexandrosakai/career-aptitude-test.git
cd career-aptitude-test
cp .env.example .env
```

Edite o `.env` e preencha, no mínimo:

```bash
# valores aleatórios longos
python3 -c "import secrets; print(secrets.token_hex(32))"     # use para VOC_SECRET e VOC_SALT
# hash da senha do painel
python3 -c "from werkzeug.security import generate_password_hash as g; print(g('SUA_SENHA'))"   # VOC_ADMIN_HASH
```

Suba os serviços:

```bash
docker compose up -d --build
```

Abra `http://127.0.0.1:8080`. O painel fica em `/painel/`.

### Sem Docker

```bash
cd backend/server
python3 -m venv venv && . venv/bin/activate
pip install -r requirements.txt
set -a; . ../../.env; set +a
export VOC_DB=/var/lib/aptitude-test/aptitude-test.db     # a pasta precisa existir e ser gravável
gunicorn --workers 2 --bind 127.0.0.1:8100 app:app
```

Sirva a pasta `web/` com nginx e repasse `/api/` para o Flask:

```nginx
location /api/ { proxy_pass http://127.0.0.1:8100; proxy_set_header X-Forwarded-For $remote_addr; }
location /     { root /var/www/aptitude-test; try_files $uri $uri/ =404; }
```

## ⚙️ Configuração

Via `.env` (veja `.env.example`):

| Variável | Descrição |
|---|---|
| `VOC_SECRET`, `VOC_SALT` | segredos de assinatura (**obrigatórios**, sem valor padrão) |
| `VOC_ADMIN_HASH` | hash da senha do painel administrativo |
| `VOC_PUBLIC_URL` | endereço público, usado nos e-mails |
| `VOC_MAX_IP_HORA`, `VOC_MAX_EMAIL_DIA` | limites de uso |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | envio de e-mail (opcional) |
| `WEB_PORT` | porta local do site no Docker |

> O cookie do painel usa o atributo `Secure`: em produção sirva por **HTTPS** (`localhost` também funciona nos navegadores modernos).

## 🧭 Como usar

1. Compartilhe o endereço do teste com os participantes.
2. Acompanhe os resultados no painel (`/painel/`), reenvie e-mails e exporte os dados.
3. Edite `backend/js/itens.js` (perguntas) e `backend/js/cursos.js` (cursos) para adaptar o teste.

## 📁 Estrutura de pastas

```
career-aptitude-test/
├── backend/
│   ├── server/            # API Flask (app.py), calc.js e requirements.txt
│   ├── js/                # motor de cálculo: itens, dimensões, cursos, relatório
│   └── database/schema.sql
├── web/                   # frontend estático (teste, painel, privacidade)
├── nginx.conf             # frontend + proxy da API (Docker)
├── Dockerfile
└── docker-compose.yml
```

## 🗺️ Roadmap

- [ ] Testes automatizados do motor de cálculo
- [ ] Banco PostgreSQL opcional
- [ ] Questionários configuráveis por arquivo
- [ ] Interface em inglês e espanhol
- [ ] Relatório em PDF

## 🤝 Como contribuir

1. Faça um fork e crie uma branch: `git checkout -b minha-melhoria`
2. Mantenha as mudanças pequenas e explique o motivo no commit
3. Abra um Pull Request descrevendo como testar

## 📄 Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE).

> Este é um instrumento **conceitual e educativo**, não substitui orientação profissional. Revise `web/privacidade.html` antes de coletar dados reais.
