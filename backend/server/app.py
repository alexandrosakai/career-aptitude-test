"""API do Teste Vocacional: grava testes, calcula o resultado no servidor, envia cópia por e-mail e serve o painel.
Dados pessoais ficam em SQLite fora da pasta pública. Configuração por variáveis de ambiente (/etc/vocacional.env)."""
import csv, hashlib, hmac, io, json, os, re, secrets, smtplib, sqlite3, ssl, subprocess, threading, time, uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from html import escape

from flask import Flask, Response, jsonify, make_response, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("VOC_DB", "/var/lib/vocacional/vocacional.db")
SECRET = os.environ["VOC_SECRET"]
ADMIN_HASH = os.environ.get("VOC_ADMIN_HASH", "")
PUBLIC_URL = os.environ.get("VOC_PUBLIC_URL", "https://example.com/vocacional/")
CALC = os.environ.get("VOC_CALC", os.path.join(BASE, "calc.js"))
NODE = os.environ.get("VOC_NODE", "/usr/bin/node")
MAX_TESTES_IP_HORA = int(os.environ.get("VOC_MAX_IP_HORA", "12"))
MAX_EMAIL_DIA = int(os.environ.get("VOC_MAX_EMAIL_DIA", "3"))

if not SECRET or len(SECRET) < 32:
    raise SystemExit("VOC_SECRET ausente ou curto demais")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
ser = URLSafeTimedSerializer(SECRET, salt=os.environ["VOC_SALT"])

EMAIL_RE = re.compile(r"^[^@\s<>\"',;]{1,64}@[^@\s<>\"',;]{1,190}\.[A-Za-z]{2,}$")


# ---------------------------------------------------------------- banco
def db():
    c = sqlite3.connect(DB_PATH, timeout=15)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA foreign_keys=ON")
    return c


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    c = db()
    c.executescript("""
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
    """)
    c.commit(); c.close()
    try:
        os.chmod(DB_PATH, 0o600)
    except OSError:
        pass


init_db()


def agora():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ip_hash():
    ip = request.headers.get("X-Real-IP") or request.remote_addr or ""
    return hashlib.sha256((SECRET + ip).encode()).hexdigest()[:24]


def th(token):
    return hashlib.sha256(token.encode()).hexdigest()


def calc(payload=None, info=False):
    args = [NODE, CALC] + (["--info"] if info else [])
    r = subprocess.run(args, input=json.dumps(payload or {}).encode(), capture_output=True, timeout=30)
    try:
        return json.loads(r.stdout.decode() or "{}")
    except ValueError:
        return {"ok": False, "erro": "cálculo sem resposta"}


INFO = calc(info=True)
CURSOS = {c["id"]: c["nome"] for c in INFO.get("cursos", [])}
N_ITENS = INFO.get("nItens", 184)


# ---------------------------------------------------------------- testes (participante)
def validar_perfil(d):
    nome = re.sub(r"\s+", " ", str(d.get("nome", ""))).strip()
    email = str(d.get("email", "")).strip().lower()
    try:
        idade = int(d.get("idade"))
    except (TypeError, ValueError):
        return None, "idade inválida"
    if not (2 <= len(nome) <= 80): return None, "nome inválido"
    if not (10 <= idade <= 99): return None, "idade inválida"
    if len(email) > 120 or not EMAIL_RE.match(email): return None, "e-mail inválido"
    cs = []
    for c in (d.get("cursos") or [])[:3]:
        if isinstance(c, dict) and c.get("id") in CURSOS: cs.append({"id": c["id"]})
        elif isinstance(c, dict) and str(c.get("texto", "")).strip(): cs.append({"texto": str(c["texto"]).strip()[:80]})
    if len(cs) < 2: return None, "informe pelo menos 2 cursos"
    cn = d.get("consent") or {}
    if cn.get("armazenar") is not True: return None, "consentimento obrigatório"
    if idade < 18 and cn.get("responsavel") is not True: return None, "confirmação do responsável obrigatória"
    consent = {"armazenar": True, "pesquisa": cn.get("pesquisa") is True, "responsavel": cn.get("responsavel") is True, "aceite_em": agora()}
    return {"nome": nome, "idade": idade, "email": email, "cursos": cs, "consent": consent}, None


@app.post("/api/testes")
def criar():
    d = request.get_json(silent=True) or {}
    p, erro = validar_perfil(d)
    if erro: return jsonify(erro=erro), 400
    c = db(); iph = ip_hash()
    n = c.execute("SELECT COUNT(*) FROM tests WHERE ip_hash=? AND criado_em > ?", (iph, datetime.fromtimestamp(time.time() - 3600, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))).fetchone()[0]
    if n >= MAX_TESTES_IP_HORA:
        c.close(); return jsonify(erro="muitas tentativas; tente mais tarde"), 429
    tid, token = uuid.uuid4().hex, secrets.token_urlsafe(24)
    c.execute("INSERT INTO tests(id,token_hash,criado_em,atualizado_em,nome,idade,email,cursos_json,consent_json,ip_hash,ua,progresso) VALUES(?,?,?,?,?,?,?,?,?,?,?,0)",
              (tid, th(token), agora(), agora(), p["nome"], p["idade"], p["email"], json.dumps(p["cursos"], ensure_ascii=False), json.dumps(p["consent"]), iph, (request.headers.get("User-Agent") or "")[:200]))
    c.commit(); c.close()
    return jsonify(id=tid, token=token)


def achar(c, tid, token):
    row = c.execute("SELECT * FROM tests WHERE id=?", (tid,)).fetchone()
    if not row or not token or not hmac.compare_digest(row["token_hash"], th(str(token))): return None
    return row


@app.put("/api/testes/<tid>")
def atualizar(tid):
    d = request.get_json(silent=True) or {}
    c = db(); row = achar(c, tid, d.get("token"))
    if not row: c.close(); return jsonify(erro="não encontrado"), 404
    try: prog = max(0, min(N_ITENS, int(d.get("progresso", row["progresso"]))))
    except (TypeError, ValueError): prog = row["progresso"]
    if "respostas" not in d:
        if row["status"] == "iniciado": c.execute("UPDATE tests SET progresso=?, atualizado_em=? WHERE id=?", (max(prog, row["progresso"]), agora(), tid)); c.commit()
        c.close(); return jsonify(ok=True)
    if row["status"] == "concluido": c.close(); return jsonify(ok=True, status="concluido")
    # Cálculo no servidor: nada do que o navegador calculou é aceito como resultado.
    out = calc({"respostas": d["respostas"], "ordem": d.get("ordem"), "perfil": {"nome": row["nome"], "idade": row["idade"], "cursos": json.loads(row["cursos_json"])}})
    if not out.get("ok"): c.close(); return jsonify(erro=out.get("erro", "falha")), 400
    R = out["R"]; cmp_ = (R.get("comparacao") or {}).get("itens", [])
    pos = [i["pos"] for i in cmp_ if not i.get("fora")]
    top3 = [{"nome": t["nome"], "pct": t["pct"]} for t in R["top3"]]
    c.execute("""UPDATE tests SET status='concluido', progresso=?, atualizado_em=?, concluido_em=?, respostas_json=?, ordem_json=?, resultado_json=?,
                 confiab_nivel=?, confiab_score=?, top3_json=?, n_citados=?, melhor_pos=?, hit_top3=?, hit_top10=?, tempo_total_ms=? WHERE id=?""",
              (N_ITENS, agora(), agora(), json.dumps(d["respostas"]), json.dumps(d.get("ordem") or []), json.dumps(R, ensure_ascii=False),
               R["confiabilidade"]["nivel"], R["confiabilidade"]["score"], json.dumps(top3, ensure_ascii=False), len(pos), min(pos) if pos else None,
               int(any(p <= 3 for p in pos)), int(any(p <= 10 for p in pos)), out["tempoTotalMs"], tid))
    c.commit()
    # limite de e-mails por destinatário/dia (evita uso do sistema para enviar spam)
    desde = datetime.fromtimestamp(time.time() - 86400, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    qtd = c.execute("SELECT COUNT(*) FROM tests WHERE email=? AND email_status IN ('enviado','enviando') AND email_enviado_em > ?", (row["email"], desde)).fetchone()[0]
    if qtd >= MAX_EMAIL_DIA:
        c.execute("UPDATE tests SET email_status='bloqueado', email_erro='limite diário por destinatário' WHERE id=?", (tid,)); c.commit()
    c.close()
    threading.Thread(target=tentar_envio, args=(tid,), daemon=True).start()
    return jsonify(ok=True, status="concluido")


@app.get("/api/testes/<tid>")
def estado(tid):
    c = db(); row = achar(c, tid, request.args.get("token")); c.close()
    if not row: return jsonify(erro="não encontrado"), 404
    e = row["email"]; masc = e[:2] + "***" + e[e.index("@"):]
    return jsonify(status=row["status"], email_status=row["email_status"], email=masc)


@app.delete("/api/testes/<tid>")
def apagar_meu(tid):
    c = db(); row = achar(c, tid, request.args.get("token"))
    if not row: c.close(); return jsonify(erro="não encontrado"), 404
    c.execute("DELETE FROM tests WHERE id=?", (tid,)); c.commit(); c.close()
    return jsonify(ok=True)


# ---------------------------------------------------------------- e-mail
def smtp_cfg():
    h = os.environ.get("SMTP_HOST", "").strip()
    if not h: return None
    return dict(host=h, port=int(os.environ.get("SMTP_PORT", "587")), user=os.environ.get("SMTP_USER", ""), pwd=os.environ.get("SMTP_PASS", ""),
                frm=os.environ.get("SMTP_FROM") or os.environ.get("SMTP_USER", ""), modo=os.environ.get("SMTP_MODO", "starttls"))


def montar_email(row, R):
    E = escape
    li = lambda a: "".join(f"<li>{E(str(x))}</li>" for x in a)
    css = "font-family:Arial,sans-serif;color:#12261b;line-height:1.5"
    areas = "".join(f"<tr><td style='padding:2px 8px 2px 0'>{E(a['nome'])}</td><td><b>{a['pct']}%</b></td></tr>" for a in R["areas"][:8])
    cursos = ""
    for t in R["top3"]:
        cursos += (f"<div style='border-left:5px solid #2563eb;padding:6px 12px;margin:12px 0;background:#f4fbf6'><h3 style='margin:0'>{t['pos']}. {E(t['nome'])} — {t['pct']}%</h3>"
                   f"<div style='color:#5b6b62'>{E(t['faixa'])} · {E(t['area'])}</div>"
                   + (f"<p><i>{E(t['relacao'])}</i></p>" if t.get("relacao") else "")
                   + (f"<p><b>Alertas</b></p><ul>{li(t['alertas'])}</ul>" if t["alertas"] else "")
                   + f"<p><b>A favor</b></p><ul>{li(t['positivos'])}</ul>"
                   + (f"<p><b>Pontos de atenção</b></p><ul>{li(t['atencao'])}</ul>" if t["atencao"] else "")
                   + f"<p><b>Realidade do dia a dia:</b> {E(t['real'])}</p></div>")
    comp = ""
    if R.get("comparacao"):
        comp = f"<h2>Seus cursos de interesse × resultado</h2><p>{E(R['comparacao']['resumo'])}</p><ul>" + "".join(
            f"<li><b>{E(i['nome'])}</b>: {E(i['status'])}" + ("" if i.get("fora") else f" (posição {i['pos']} de {i['total']}, {i['pct']}%)") + "</li>" for i in R["comparacao"]["itens"]) + "</ul>"
    conf = R["confiabilidade"]
    html = f"""<div style="{css};max-width:640px">
<h1>Seu resultado do Teste Vocacional</h1>
<p>Olá, {E(row['nome'])}! Segue a cópia do seu resultado.</p>
<p style="background:#e5fff0;padding:10px;border-radius:8px;font-size:14px">{E(R['aviso'])}</p>
<h2>Confiabilidade da avaliação: {E(conf['nivel'])}</h2><p>{E(conf['texto'])}</p>
<h2>Resumo do perfil</h2><p>{E(R['resumo'])}</p>
<h2>Áreas mais compatíveis</h2><table>{areas}</table>
<h2>Top 3 cursos para investigar</h2>{cursos}{comp}
<h2>Possíveis conflitos (pontos para investigar)</h2>{('<ul>'+li([c['texto'] for c in R['conflitos']])+'</ul>') if R['conflitos'] else '<p>Nenhum conflito relevante.</p>'}
<h2>O que pesquisar antes de escolher</h2><ul>{li(R['pesquisarGeral'])}</ul>
<h2>Próximos passos</h2><ul>{li(R['proximos'])}</ul>
<hr><p style="font-size:12px;color:#5b6b62">Você recebeu este e-mail porque este endereço foi informado no Teste Vocacional da Empresa Exemplo ({E(PUBLIC_URL)}). Se não foi você, ignore esta mensagem.
Para apagar seus dados, use o botão "Apagar meus dados" no resultado do teste, no mesmo aparelho, ou responda a este e-mail.</p></div>"""
    txt = (f"Olá, {row['nome']}!\n\nResultado do Teste Vocacional (cópia)\n\n{R['aviso']}\n\nConfiabilidade: {conf['nivel']}\n{R['resumo']}\n\nTop 3:\n"
           + "\n".join(f"{t['pos']}. {t['nome']} — {t['pct']}% ({t['faixa']})" for t in R["top3"])
           + f"\n\nVeja o relatório completo em HTML neste e-mail ou refaça o teste em {PUBLIC_URL}\n")
    return html, txt


def enviar(para, assunto, html, txt):
    cfg = smtp_cfg()
    if not cfg: raise RuntimeError("SMTP não configurado")
    m = EmailMessage(); m["Subject"] = assunto; m["From"] = cfg["frm"]; m["To"] = para; m["Reply-To"] = cfg["frm"]
    m.set_content(txt); m.add_alternative(html, subtype="html")
    if cfg["modo"] == "ssl":
        s = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=30, context=ssl.create_default_context())
    else:
        s = smtplib.SMTP(cfg["host"], cfg["port"], timeout=30)
        if cfg["modo"] == "starttls": s.starttls(context=ssl.create_default_context())
    try:
        if cfg["user"]: s.login(cfg["user"], cfg["pwd"])
        s.send_message(m)
    finally:
        try: s.quit()
        except Exception: pass


def tentar_envio(tid):
    c = db()
    try:
        if not smtp_cfg():
            c.execute("UPDATE tests SET email_erro='SMTP não configurado (na fila)' WHERE id=? AND email_status='pendente'", (tid,)); c.commit(); return
        cur = c.execute("UPDATE tests SET email_status='enviando', email_tentativas=email_tentativas+1 WHERE id=? AND email_status='pendente' AND email_tentativas<5", (tid,))
        c.commit()
        if cur.rowcount != 1: return
        row = c.execute("SELECT * FROM tests WHERE id=?", (tid,)).fetchone()
        try:
            html, txt = montar_email(row, json.loads(row["resultado_json"]))
            enviar(row["email"], "Seu resultado do Teste Vocacional", html, txt)
            c.execute("UPDATE tests SET email_status='enviado', email_enviado_em=?, email_erro=NULL WHERE id=?", (agora(), tid))
        except Exception as e:  # noqa
            c.execute("UPDATE tests SET email_status=?, email_erro=? WHERE id=?", ("pendente" if row["email_tentativas"] < 5 else "erro", str(e)[:300], tid))
        c.commit()
    finally:
        c.close()


def laco_reenvio():
    while True:
        time.sleep(300)
        try:
            if smtp_cfg():
                c = db(); ids = [r[0] for r in c.execute("SELECT id FROM tests WHERE status='concluido' AND email_status='pendente' AND email_tentativas<5 LIMIT 20")]; c.close()
                for i in ids: tentar_envio(i)
        except Exception:
            pass


threading.Thread(target=laco_reenvio, daemon=True).start()


# ---------------------------------------------------------------- painel (administrador)
def admin_ok():
    tk = request.cookies.get("vpa")
    if not tk: return False
    try: ser.loads(tk, max_age=12 * 3600); return True
    except (BadSignature, SignatureExpired): return False


def exige_admin(f):
    from functools import wraps
    @wraps(f)
    def w(*a, **k):
        if not admin_ok(): return jsonify(erro="não autorizado"), 401
        if request.method != "GET" and request.headers.get("X-Requested-With") != "painel": return jsonify(erro="requisição inválida"), 403
        return f(*a, **k)
    return w


@app.post("/api/admin/login")
def login():
    c = db(); iph = ip_hash()
    c.execute("DELETE FROM login_failures WHERE ts < ?", (time.time() - 900,))
    if c.execute("SELECT COUNT(*) FROM login_failures WHERE ip_hash=?", (iph,)).fetchone()[0] >= 5:
        c.commit(); c.close(); return jsonify(erro="muitas tentativas; aguarde 15 minutos"), 429
    senha = (request.get_json(silent=True) or {}).get("senha", "")
    if ADMIN_HASH and check_password_hash(ADMIN_HASH, str(senha)):
        c.commit(); c.close()
        r = make_response(jsonify(ok=True)); r.set_cookie("vpa", ser.dumps("admin"), max_age=12 * 3600, httponly=True, secure=True, samesite="Strict", path="/vocacional/")
        return r
    time.sleep(1)
    c.execute("INSERT INTO login_failures VALUES(?,?)", (iph, time.time())); c.commit(); c.close()
    return jsonify(erro="senha incorreta"), 401


@app.post("/api/admin/logout")
def logout():
    r = make_response(jsonify(ok=True)); r.delete_cookie("vpa", path="/vocacional/"); return r


@app.get("/api/admin/sessao")
def sessao(): return jsonify(ok=admin_ok(), smtp=bool(smtp_cfg())) if admin_ok() else (jsonify(ok=False), 401)


def linha(r):
    cursos = json.loads(r["cursos_json"])
    return {"id": r["id"], "nome": r["nome"], "idade": r["idade"], "email": r["email"], "criado_em": r["criado_em"], "concluido_em": r["concluido_em"],
            "atualizado_em": r["atualizado_em"], "progresso": r["progresso"], "status": r["status"], "confiab": r["confiab_nivel"], "confiab_score": r["confiab_score"],
            "cursos": [CURSOS.get(x.get("id"), x.get("texto")) for x in cursos], "top3": json.loads(r["top3_json"]) if r["top3_json"] else [],
            "n_citados": r["n_citados"], "melhor_pos": r["melhor_pos"], "hit_top3": r["hit_top3"], "hit_top10": r["hit_top10"], "tempo_total_ms": r["tempo_total_ms"],
            "email_status": r["email_status"], "email_erro": r["email_erro"], "email_enviado_em": r["email_enviado_em"], "pesquisa": json.loads(r["consent_json"]).get("pesquisa")}


@app.get("/api/admin/testes")
@exige_admin
def listar():
    c = db(); q = (request.args.get("q") or "").strip().lower()
    rows = [linha(r) for r in c.execute("SELECT * FROM tests ORDER BY criado_em DESC LIMIT 2000")]; c.close()
    if q: rows = [r for r in rows if q in (r["nome"] + " " + r["email"] + " " + " ".join(r["cursos"])).lower()]
    st = request.args.get("status")
    if st in ("iniciado", "concluido"): rows = [r for r in rows if r["status"] == st]
    return jsonify(rows)


@app.get("/api/admin/resumo")
@exige_admin
def resumo():
    c = db(); rs = [linha(r) for r in c.execute("SELECT * FROM tests")]; c.close()
    con = [r for r in rs if r["status"] == "concluido"]
    med = lambda a: (sorted(a)[len(a) // 2] if a else None)
    com = [r for r in con if r["n_citados"]]
    return jsonify(total=len(rs), concluidos=len(con), em_andamento=len(rs) - len(con),
                   taxa_conclusao=round(100 * len(con) / len(rs)) if rs else None,
                   tempo_mediano_min=round(med([r["tempo_total_ms"] for r in con if r["tempo_total_ms"]]) / 60000, 1) if con else None,
                   idade_mediana=med([r["idade"] for r in rs]),
                   confiab={k: sum(1 for r in con if r["confiab"] == k) for k in ("Alta", "Média", "Baixa")},
                   hit_top3=round(100 * sum(1 for r in com if r["hit_top3"]) / len(com)) if com else None,
                   hit_top10=round(100 * sum(1 for r in com if r["hit_top10"]) / len(com)) if com else None,
                   n_com_citados=len(com), emails={k: sum(1 for r in con if r["email_status"] == k) for k in ("enviado", "pendente", "erro", "bloqueado")},
                   smtp=bool(smtp_cfg()))


@app.get("/api/admin/testes/<tid>")
@exige_admin
def detalhe(tid):
    c = db(); r = c.execute("SELECT * FROM tests WHERE id=?", (tid,)).fetchone(); c.close()
    if not r: return jsonify(erro="não encontrado"), 404
    d = linha(r); d["resultado"] = json.loads(r["resultado_json"]) if r["resultado_json"] else None
    d["respostas"] = json.loads(r["respostas_json"]) if r["respostas_json"] else None
    return jsonify(d)


@app.delete("/api/admin/testes/<tid>")
@exige_admin
def apagar_admin(tid):
    c = db(); c.execute("DELETE FROM tests WHERE id=?", (tid,)); c.commit(); c.close(); return jsonify(ok=True)


@app.post("/api/admin/testes/<tid>/reenviar")
@exige_admin
def reenviar(tid):
    if not smtp_cfg(): return jsonify(erro="SMTP não configurado"), 400
    c = db(); c.execute("UPDATE tests SET email_status='pendente', email_tentativas=0 WHERE id=? AND status='concluido'", (tid,)); c.commit(); c.close()
    tentar_envio(tid)
    c = db(); r = c.execute("SELECT email_status,email_erro FROM tests WHERE id=?", (tid,)).fetchone(); c.close()
    return jsonify(email_status=r["email_status"], erro=r["email_erro"]) if r else (jsonify(erro="não encontrado"), 404)


def csv_resp(nome, cab, linhas):
    buf = io.StringIO(); w = csv.writer(buf, delimiter=";"); w.writerow(cab)
    for l in linhas: w.writerow([("'" + str(x) if isinstance(x, str) and x[:1] in "=+-@" else x) for x in l])  # evita injeção de fórmulas
    return Response("﻿" + buf.getvalue(), mimetype="text/csv", headers={"Content-Disposition": f"attachment; filename={nome}"})


@app.get("/api/admin/exportar.csv")
@exige_admin
def exportar():
    c = db(); rs = [linha(r) for r in c.execute("SELECT * FROM tests ORDER BY criado_em")]; c.close()
    cab = ["id", "criado_em", "concluido_em", "nome", "idade", "email", "status", "progresso", "confiabilidade", "indice", "cursos_citados", "top1", "top2", "top3", "melhor_posicao_citado", "citado_no_top3", "citado_no_top10", "tempo_min", "email_status"]
    return csv_resp("testes-vocacional.csv", cab, [[r["id"], r["criado_em"], r["concluido_em"], r["nome"], r["idade"], r["email"], r["status"], r["progresso"], r["confiab"], r["confiab_score"], " | ".join(r["cursos"])]
                                                  + [f"{t['nome']} {t['pct']}%" for t in r["top3"]] + [""] * (3 - len(r["top3"]))
                                                  + [r["melhor_pos"], r["hit_top3"], r["hit_top10"], round(r["tempo_total_ms"] / 60000, 1) if r["tempo_total_ms"] else "", r["email_status"]] for r in rs])


@app.get("/api/admin/exportar-pesquisa.json")
@exige_admin
def exportar_pesquisa():
    """Somente quem autorizou uso em pesquisa; SEM nome, e-mail, ip ou id original (anonimizado)."""
    c = db(); out = []
    for r in c.execute("SELECT * FROM tests WHERE status='concluido' ORDER BY criado_em"):
        if not json.loads(r["consent_json"]).get("pesquisa"): continue
        R = json.loads(r["resultado_json"])
        out.append({"faixa_idade": "<18" if r["idade"] < 18 else ("18-24" if r["idade"] < 25 else "25+"), "respostas": json.loads(r["respostas_json"]), "vetor": R["vec"],
                    "confiabilidade": R["confiabilidade"]["nivel"], "indice": R["confiabilidade"]["score"], "top3": json.loads(r["top3_json"]), "hit_top3": r["hit_top3"], "hit_top10": r["hit_top10"]})
    c.close()
    return Response(json.dumps({"geradoEm": agora(), "versaoModelo": "conceitual-0.1", "n": len(out), "testes": out}, ensure_ascii=False), mimetype="application/json",
                    headers={"Content-Disposition": "attachment; filename=pesquisa-anonimizada.json"})


@app.after_request
def cab(r):
    r.headers["Cache-Control"] = "no-store"; r.headers["X-Content-Type-Options"] = "nosniff"; r.headers["X-Robots-Tag"] = "noindex"
    return r
