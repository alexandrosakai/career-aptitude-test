/* Cálculo no servidor: usa o MESMO motor do navegador (public/js). Entrada (stdin, JSON): {respostas, ordem, perfil}.
   Saída (stdout, JSON): {ok, R, nResp, tempoTotalMs} ou {ok:false, erro}. Com --info, lista os cursos do banco. */
const fs = require('fs'), path = require('path');
const dir = process.env.VOC_JS_DIR || [path.join(__dirname, '../public/js'), path.join(__dirname, '../js')].find(d => fs.existsSync(path.join(d, 'engine.js')));
globalThis.VOC = {};
['dims', 'itens', 'cursos', 'engine', 'report'].forEach(f => require(path.join(dir, f + '.js')));
const V = globalThis.VOC;
const out = o => process.stdout.write(JSON.stringify(o));

if (process.argv.includes('--info')) {
  out({ ok: true, cursos: V.cursos.map(c => ({ id: c.id, nome: c.nome })), nItens: V.items.length });
} else {
  let buf = '';
  process.stdin.on('data', d => { buf += d; if (buf.length > 2e6) process.exit(2); });
  process.stdin.on('end', () => {
    try {
      const inp = JSON.parse(buf), resp = inp.respostas || {}, clean = {};
      for (const id in resp) {
        const it = V.itemById[id]; if (!it) return out({ ok: false, erro: 'item desconhecido ' + id });
        const v = resp[id] && resp[id].v, max = it.t === 'L' ? 5 : it.opts.length;
        const okv = Number.isInteger(v) && (it.t === 'L' ? v >= 1 && v <= 5 : v >= 0 && v < max);
        if (!okv) return out({ ok: false, erro: 'valor inválido em ' + id });
        clean[id] = { v, t: Math.max(0, Math.min(1800000, Math.round(+resp[id].t || 0))) };
      }
      const n = Object.keys(clean).length;
      if (n < V.items.length) return out({ ok: false, erro: `respostas incompletas (${n}/${V.items.length})` });
      const ordem = Array.isArray(inp.ordem) ? inp.ordem.filter(id => V.itemById[id]) : V.items.map(i => i.id);
      const perfil = inp.perfil && { nome: String(inp.perfil.nome || '').slice(0, 80), idade: +inp.perfil.idade, cursos: (inp.perfil.cursos || []).slice(0, 3).map(c => c.id && V.cursoById[c.id] ? { id: c.id } : { texto: String(c.texto || '').slice(0, 80) }) };
      const sc = V.engine.score(clean), rel = V.engine.reliability(clean, ordem, sc.acq), rec = V.engine.recommend(sc.vec, rel);
      const res = { vec: sc.vec, rel, rec, areas: V.engine.areaMap(rec.all), conflitos: V.engine.conflitos(sc.vec), seVoce: V.engine.seVoce(rec, sc.vec) };
      out({ ok: true, R: V.report.build(res, perfil), metricas: rel.metricas, nResp: n, tempoTotalMs: Object.values(clean).reduce((s, x) => s + x.t, 0) });
    } catch (e) { out({ ok: false, erro: 'falha no cálculo: ' + e.message }); }
  });
}
