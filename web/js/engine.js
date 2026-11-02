/* Motor de pontuação, confiabilidade e recomendação.
   MODELO CONCEITUAL: pesos, limiares e alvos dos cursos são hipóteses de projeto, a calibrar após estudo piloto. */
(function () {
  const V = (globalThis.VOC = globalThis.VOC || {});
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

  /* ---------- Pesos dos blocos (ver docs/PROJETO.md, Etapa 6 e 7) ---------- */
  const PESOS = { interesses: 0.32, eficacia: 0.18, valores: 0.12, estilo: 0.12, personalidade: 0.10, academico: 0.08, motivadores: 0.08 };
  const CENTER_GAIN = 1.4; // heurística até existirem normas (centragem intra-pessoa, como recomendado para valores)

  /* ---------- Ordem de apresentação (determinística por semente) ---------- */
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function buildOrder(seed) {
    const r = rng(seed || 1);
    const shuf = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const order = [];
    const qc = shuf(V.items.filter(i => i.m === 9));
    const modsWithQC = [2, 3, 4, 5, 6, 7, 8, 1]; // distribui itens de controle entre módulos
    for (let m = 1; m <= 8; m++) {
      let list = shuf(V.items.filter(i => i.m === m));
      // evita itens do mesmo grupo de consistência vizinhos
      for (let pass = 0; pass < 3; pass++) for (let i = 1; i < list.length; i++) {
        if (list[i].k && list[i].k === list[i - 1].k) { const j = (i + 3) % list.length; [list[i], list[j]] = [list[j], list[i]]; }
      }
      const extra = qc.filter((_, idx) => modsWithQC[idx] === m);
      extra.forEach(q => list.splice(1 + Math.floor(r() * (list.length - 1)), 0, q));
      list.forEach(i => order.push(i.id));
    }
    return order;
  }

  /* ---------- Acumulação de evidência por dimensão ---------- */
  function itemEvidence(it, resp, acq) {
    // retorna lista [dim, carga, x, xmax]
    const out = [];
    if (it.t === 'L') {
      let raw = resp.v;
      if (it.sc === 'cc') raw = clamp(raw - acq, 1, 5);
      let x = raw - 3; if (it.rev) x = -x;
      for (const d in it.d) out.push([d, it.d[d], x, 2]);
    } else if (it.t === 'F') {
      it.opts.forEach((o, j) => { const x = j === resp.v ? 1.5 : -1.5; for (const d in o.d) out.push([d, o.d[d], x, 1.5]); });
    } else if (it.t === 'M') {
      it.opts.forEach((o, j) => { const x = j === resp.v ? 2 : -0.7; for (const d in o.d) out.push([d, o.d[d], x, 2]); });
    }
    return out;
  }
  function keyedValue(it, resp, acq) { // valor "no sentido do traço" (−2..+2) para testes de consistência
    let raw = resp.v; if (it.sc === 'cc') raw = clamp(raw - acq, 1, 5);
    let x = raw - 3; return it.rev ? -x : x;
  }
  function accumulate(items, responses, acq) {
    const num = {}, den = {};
    for (const it of items) {
      const resp = responses[it.id]; if (!resp || it.w === 0) continue;
      for (const [d, l, x, xm] of itemEvidence(it, resp, acq)) {
        num[d] = (num[d] || 0) + it.w * l * x;
        den[d] = (den[d] || 0) + it.w * Math.abs(l) * xm;
      }
    }
    const s = {};
    for (const d in den) if (den[d] > 0) s[d] = 50 + 50 * (num[d] / den[d]);
    return s;
  }
  function acquiescence(responses) {
    const byK = {};
    V.items.forEach(i => { if (i.k && i.sc === 'cc' && responses[i.id]) (byK[i.k] = byK[i.k] || []).push(i); });
    const vals = [];
    for (const k in byK) {
      const g = byK[k]; if (g.length !== 2 || g[0].rev === g[1].rev) continue;
      vals.push(((responses[g[0].id].v - 3) + (responses[g[1].id].v - 3)) / 2);
    }
    return vals.length ? mean(vals) : 0;
  }

  function score(responses) {
    const acq = acquiescence(responses);
    const raw = accumulate(V.items, responses, acq);
    const vec = {};
    for (const gk in V.groups) {
      const ds = Object.keys(V.dims).filter(d => V.dims[d].g === gk && raw[d] != null);
      if (!ds.length) continue;
      if (V.groups[gk].c) {
        const m = mean(ds.map(d => raw[d]));
        ds.forEach(d => { vec[d] = clamp(50 + CENTER_GAIN * (raw[d] - m), 0, 100); });
      } else ds.forEach(d => { vec[d] = clamp(raw[d], 0, 100); });
    }
    for (const d in vec) vec[d] = Math.round(vec[d]);
    return { vec, raw, acq };
  }

  /* ---------- Índice de confiabilidade ---------- */
  function corr(a, b) {
    const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0;
    a.forEach((x, i) => { n += (x - ma) * (b[i] - mb); da += (x - ma) ** 2; db += (b[i] - mb) ** 2; });
    return da && db ? n / Math.sqrt(da * db) : 0;
  }
  function reliability(responses, order, acq) {
    const flags = []; let s = 100;
    const pen = (p, msg) => { s -= p; flags.push(msg); };
    const ans = V.items.filter(i => responses[i.id]);
    if (ans.length < V.items.length * 0.9) pen(30, 'Muitas perguntas sem resposta.');

    // tempos
    const ts = ans.map(i => responses[i.id].t).filter(t => t != null && t >= 0);
    if (ts.length) {
      const med = median(ts), fast = ts.filter(t => t < 700).length / ts.length, total = ts.reduce((a, b) => a + b, 0);
      if (med < 1500) pen(30, 'Respostas muito rápidas (mediana abaixo de 1,5 s por pergunta).');
      else if (fast > 0.25) pen(15, 'Mais de 25% das respostas foram dadas em menos de 0,7 s.');
      if (total < 6 * 60 * 1000) pen(15, 'Tempo total muito curto para ler as perguntas.');
    }
    // sequência igual
    const likertOrder = (order || V.items.map(i => i.id)).map(id => V.itemById[id]).filter(i => i && i.t === 'L' && responses[i.id]);
    let run = 1, maxRun = 1;
    for (let i = 1; i < likertOrder.length; i++) { run = responses[likertOrder[i].id].v === responses[likertOrder[i - 1].id].v ? run + 1 : 1; maxRun = Math.max(maxRun, run); }
    if (maxRun >= 15) pen(20, `Sequência de ${maxRun} respostas iguais seguidas.`);
    else if (maxRun >= 10) pen(8, `Sequência de ${maxRun} respostas iguais seguidas.`);
    // extremos
    const lik = likertOrder.map(i => responses[i.id].v);
    if (lik.length && lik.filter(v => v === 1 || v === 5).length / lik.length > 0.7) pen(8, 'Uso excessivo das opções extremas.');
    // itens de baixa frequência e atenção
    const IF = V.items.filter(i => i.qc === 'IF' && responses[i.id]).filter(i => responses[i.id].v >= 4).length;
    if (IF) pen(Math.min(24, IF * 8), 'Concordância com afirmações improváveis (' + IF + ').');
    const ACfail = V.items.filter(i => i.qc === 'AC' && responses[i.id]).filter(i => responses[i.id].v !== (i.id === 'Q07' ? 4 : 2)).length;
    if (ACfail) pen(ACfail * 12, 'Falha em checagem de atenção (' + ACfail + ').');
    // desejabilidade social
    const sd = V.items.filter(i => i.qc === 'SD' && responses[i.id]).map(i => (i.rev ? -1 : 1) * (responses[i.id].v - 3));
    const sdIdx = mean(sd);
    if (sd.length && sdIdx > 1.3) pen(26, 'Padrão de resposta muito idealizado (desejabilidade social alta).');
    if (Math.abs(acq) > 0.6) pen(10, acq > 0 ? 'Tendência a concordar com quase tudo.' : 'Tendência a discordar de quase tudo.');
    // consistência interna
    const byK = {};
    V.items.forEach(i => { if (i.k && responses[i.id] && i.t === 'L') (byK[i.k] = byK[i.k] || []).push(keyedValue(i, responses[i.id], acq)); });
    const ranges = Object.values(byK).filter(g => g.length >= 2).map(g => Math.max(...g) - Math.min(...g));
    const inc = mean(ranges);
    const shareBad = ranges.length ? ranges.filter(x => x >= 3).length / ranges.length : 0;
    if (ranges.length >= 6) { if (inc > 1.1 || shareBad > 0.2) pen(25, 'Respostas inconsistentes entre perguntas parecidas.'); else if (inc > 0.95 || shareBad > 0.12) pen(8, 'Algumas inconsistências entre perguntas parecidas.'); }
    // perfil achatado: respostas sem estrutura (típico de resposta aleatória)
    const rs = accumulate(V.items, responses, acq), rv = ['R', 'I', 'A', 'S', 'E', 'C'].map(d => rs[d]).filter(x => x != null);
    const amp = rv.length ? Math.max(...rv) - Math.min(...rv) : null;
    if (amp != null && amp < 25) pen(10, 'Perfil de interesses pouco diferenciado (poucas preferências claras).');
    // coerência entre métodos (Likert x escolha forçada) nos interesses
    const mod1L = V.items.filter(i => i.m === 1 && i.t === 'L'), mod1F = V.items.filter(i => i.m === 1 && i.t === 'F');
    const sl = accumulate(mod1L, responses, acq), sf = accumulate(mod1F, responses, acq);
    const R6 = ['R', 'I', 'A', 'S', 'E', 'C'];
    let r = null;
    if (R6.every(d => sl[d] != null && sf[d] != null)) {
      r = corr(R6.map(d => sl[d]), R6.map(d => sf[d]));
      if (r < 0) pen(15, 'Interesses diferentes conforme o formato da pergunta (baixa coerência).');
      else if (r < 0.2) pen(6, 'Coerência moderada entre formatos de pergunta.');
    }
    s = clamp(Math.round(s), 0, 100);
    if (ans.length < V.items.length * 0.9) s = Math.min(s, 40); // teste incompleto nunca passa de "Baixa"
    const nivel = s >= 75 ? 'Alta' : s >= 50 ? 'Média' : 'Baixa';
    return { score: s, nivel, flags, metricas: { amplitudeInteresses: amp == null ? null : Math.round(amp), compartilhaInconsistentes: +shareBad.toFixed(2), maxRun, IF, ACfail, sdIdx: +sdIdx.toFixed(2), acq: +acq.toFixed(2), inconsistencia: +inc.toFixed(2), coerenciaMetodos: r == null ? null : +r.toFixed(2), medianaMs: ts.length ? Math.round(median(ts)) : null } };
  }

  /* ---------- Compatibilidade com cursos ---------- */
  const GP = { p: 'p_', a: 'a_', w: 'w_', v: 'v_', m: 'm_', b: 'b_' };
  function fitOne(mode, u, t) {
    if (mode === 'min') return Math.max(0, 1 - Math.max(0, t - u) / 38);
    if (mode === 'max') return Math.max(0, 1 - Math.max(0, u - t) / 38);
    if (mode === 'minR') return Math.max(0, 1 - Math.max(0, t - u) / 55);   // interesses: só penaliza a falta
    if (mode === 'maxR') return Math.max(0, 1 - Math.max(0, u - t) / 50);   // letras fora do código: só penaliza excesso grande
    return Math.max(0, 1 - Math.abs(u - t) / 42);
  }
  const modeOf = t => (t >= 70 ? 'min' : t <= 35 ? 'max' : 'match');

  function courseTargets(c) {
    const T = []; // {d, t, imp, mode, block}
    const h = c.h.split('');
    const rT = [80, 66, 55];
    ['R', 'I', 'A', 'S', 'E', 'C'].forEach(d => {
      const idx = h.indexOf(d);
      T.push({ d, t: idx >= 0 ? rT[idx] : 48, imp: idx === 0 ? 1.5 : idx === 1 ? 1.1 : idx === 2 ? 0.7 : 0.4, mode: idx >= 0 ? 'minR' : 'maxR', block: 'interesses', core: idx >= 0 && idx < 2 });
      if (idx >= 0) T.push({ d: 'e_' + d, t: [68, 60, 50][idx], imp: 1, mode: 'min', block: 'eficacia' });
    });
    const blk = { p: 'interesses', a: 'academico', w: 'estilo', v: 'valores', m: 'motivadores', b: 'personalidade' };
    for (const g in blk) for (const k in (c.T[g] || {})) {
      const t = c.T[g][k];
      T.push({ d: GP[g] + k, t, imp: g === 'b' ? 0.7 : 1, mode: g === 'b' ? (t >= 70 ? 'min' : 'match') : modeOf(t), block: blk[g] });
    }
    return T;
  }

  function evalCourse(c, vec, relNivel) {
    const T = courseTargets(c);
    const B = {}; // por bloco
    const detail = [];
    for (const x of T) {
      const u = vec[x.d]; if (u == null) continue;
      const f = fitOne(x.mode, u, x.t);
      const b = (B[x.block] = B[x.block] || { s: 0, w: 0 });
      b.s += x.imp * f; b.w += x.imp;
      detail.push({ ...x, u, f });
    }
    const fits = {}; let num = 0, den = 0;
    for (const b in B) { fits[b] = B[b].s / B[b].w; num += PESOS[b] * fits[b]; den += PESOS[b]; }
    let fit = den ? num / den : 0;

    // interesse central (2 principais letras Holland)
    const core = detail.filter(x => x.core);
    const coreInt = core.length ? core.reduce((s, x) => s + x.imp * x.f, 0) / core.reduce((s, x) => s + x.imp, 0) : 0;
    const alerts = []; let adj = 0;
    const nm = d => V.dims[d].nome;
    if (coreInt >= 0.78 && fits.eficacia != null && fits.eficacia < 0.55) {
      adj -= 0.06;
      const w = detail.filter(x => x.block === 'eficacia' && x.f < 0.6).map(x => nm(x.d).toLowerCase());
      alerts.push({ tipo: 'eficacia', texto: `Seu interesse é alto, mas sua confiança nesse tipo de atividade ainda é baixa (${w.join(', ') || 'atividades centrais da área'}). Isso pode ser falta de experiência, não de capacidade: vale testar na prática.` });
    }
    if (coreInt >= 0.78 && fits.estilo != null && fits.estilo < 0.5) {
      adj -= 0.05;
      const w = detail.filter(x => x.block === 'estilo' && x.f < 0.5).sort((a, b) => a.f - b.f).slice(0, 3).map(x => nm(x.d).toLowerCase());
      alerts.push({ tipo: 'ambiente', texto: `Você se interessa pelas atividades, mas o ambiente real de trabalho parece pouco confortável para você (${w.join(', ')}).` });
    }
    const acad = detail.filter(x => x.block === 'academico' && x.t >= 70 && x.u < 35);
    if (acad.length) { adj -= Math.min(0.06, acad.length * 0.03); alerts.push({ tipo: 'academico', texto: `O curso costuma exigir bastante de ${acad.map(x => nm(x.d).toLowerCase()).join(' e ')}, e você demonstrou pouca afinidade por isso hoje.` }); }
    if (c.anos >= 5 && vec.x_longo != null && vec.x_longo < 35) { adj -= 0.02; alerts.push({ tipo: 'contexto', texto: `O curso dura cerca de ${c.anos} anos e você indicou pouca disposição para uma formação longa.` }); }
    if (c.anos >= 5 && vec.x_renda != null && vec.x_renda > 70) { adj -= 0.02; alerts.push({ tipo: 'contexto', texto: `Você indicou necessidade de renda rápida, e este curso costuma levar mais tempo até a atuação plena.` }); }
    if (coreInt >= 0.82 && (fits.eficacia ?? 0) >= 0.8 && (fits.estilo ?? 0) >= 0.7) adj += 0.03;
    fit += adj;
    if (relNivel === 'Baixa') fit = 0.5 + (fit - 0.5) * 0.8;
    fit = clamp(fit, 0.05, 0.99);

    // fatores positivos e de atenção
    const pos = detail.filter(x => x.f >= 0.85 && x.imp >= 1 && notable(x)).sort((a, b) => b.imp * b.f - a.imp * a.f).slice(0, 5).map(x => {
      const h = V.dims[x.d].hi;
      return x.mode === 'max' ? `Você não mostrou ${h}, o que combina com o perfil costumeiro do curso` : `Você demonstrou ${h}, algo muito presente nesse curso`;
    });
    const neg = detail.filter(x => x.f < 0.55 && x.imp >= 0.7 && x.block !== 'interesses' || (x.block === 'interesses' && x.f < 0.45 && x.imp >= 1.2))
      .sort((a, b) => a.f - b.f).slice(0, 4).map(x => {
        const nome = V.dims[x.d].nome.toLowerCase();
        return x.mode === 'max' ? `Pontuação mais alta que o esperado em ${nome} (${x.u}) para este curso` : x.u < x.t ? `${cap(nome)} abaixo do que o curso costuma pedir (você: ${x.u})` : `${cap(nome)} acima do perfil usual do curso (você: ${x.u})`;
      });
    return { id: c.id, fit, pct: Math.min(95, Math.round(fit * 100)), blocks: fits, coreInt, alerts, pos, neg, forte: adj > 0 };
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function notable(x) { // evita elogiar dimensão em que a pessoa está só "no meio"
    if (x.mode === 'max') return x.u <= 45;
    if (V.groups[V.dims[x.d].g].c) return x.u >= 58;
    return x.u >= 62;
  }

  function simR(a, b) { // similaridade de perfil de interesses entre dois cursos (cosseno em 6 letras) + mesma área
    const v = c => ['R', 'I', 'A', 'S', 'E', 'C'].map(d => { const i = c.h.indexOf(d); return i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 1 : 0; });
    const x = v(a), y = v(b); const dot = x.reduce((s, q, i) => s + q * y[i], 0);
    const cos = dot / (Math.hypot(...x) * Math.hypot(...y));
    return 0.6 * cos + 0.4 * (a.area === b.area ? 1 : 0);
  }

  function recommend(vec, rel) {
    const list = V.cursos.map(c => evalCourse(c, vec, rel.nivel)).sort((a, b) => b.fit - a.fit);
    const byId = Object.fromEntries(list.map(x => [x.id, x]));
    const top = list[0];
    // 2ª e 3ª: alternativas relevantes (perto em score, mas diversas)
    const pool = list.slice(1, 30).filter(x => x.fit >= top.fit - 0.12 && x.coreInt >= 0.6);
    const picked = [top];
    while (picked.length < 3 && pool.length) {
      let best = null, bs = -9;
      for (const x of pool) {
        if (picked.includes(x)) continue;
        const mx = Math.max(...picked.map(p => simR(V.cursoById[p.id], V.cursoById[x.id])));
        const sc = x.fit - 0.15 * mx;
        if (sc > bs) { bs = sc; best = x; }
      }
      if (!best) break; picked.push(best);
    }
    picked.sort((a, b) => b.fit - a.fit);
    const rest = list.filter(x => !picked.includes(x)).slice(0, 9);
    return { all: list, byId, top3: picked, alternativos: rest };
  }

  function areaMap(list) {
    const out = [];
    for (const a in V.areas) {
      const l = list.filter(x => V.cursoById[x.id].area === a).slice(0, 3);
      out.push({ area: a, nome: V.areas[a], pct: Math.round(mean(l.map(x => x.pct))) });
    }
    return out.sort((a, b) => b.pct - a.pct);
  }

  function relacao(top, alt, vec) {
    const A = V.cursoById[top.id], B = V.cursoById[alt.id];
    const emph = [];
    for (const g of ['p', 'w', 'a']) for (const k in (B.T[g] || {})) {
      const d = GP[g] + k; if ((B.T[g][k] >= 70) && (!(A.T[g] || {})[k] || A.T[g][k] < 60) && (vec[d] || 0) >= 55) emph.push(V.dims[d].nome.toLowerCase());
    }
    const shared = [];
    for (const g of ['p', 'w']) for (const k in (B.T[g] || {})) { const d = GP[g] + k; if (B.T[g][k] >= 70 && (A.T[g] || {})[k] >= 70 && (vec[d] || 0) >= 55) shared.push(V.dims[d].nome.toLowerCase()); }
    const mesma = A.area === B.area;
    let t = mesma ? `Mesma grande área (${V.areas[A.area]}), com ênfase diferente.` : `Área vizinha (${V.areas[B.area]}), que preserva parte do que apareceu no seu perfil.`;
    if (shared.length) t += ` Mantém o que você demonstrou em: ${[...new Set(shared)].slice(0, 3).join(', ')}.`;
    if (emph.length) t += ` Diferença principal: dá mais peso a ${[...new Set(emph)].slice(0, 3).join(', ')}.`;
    return t;
  }

  const AXES = [['p_pessoas', 'trabalhar mais diretamente com pessoas'], ['p_tecnologia', 'mergulhar mais em tecnologia'], ['p_criatividade', 'ter mais espaço para criar'], ['p_negocios', 'ficar mais perto de negócios'], ['p_natureza', 'trabalhar mais perto da natureza'], ['p_investigacao', 'pesquisar e investigar mais'], ['p_organizacao', 'trabalhar com mais método e organização'], ['p_numeros', 'lidar mais com números']];
  function seVoce(rec, vec) {
    const out = [], used = new Set(rec.top3.map(x => x.id));
    const top = rec.top3[0];
    for (const [d, txt] of AXES) {
      if ((vec[d] || 0) < 52) continue;
      const k = d.slice(2);
      const cand = rec.all.slice(0, 25).filter(x => !used.has(x.id) && x.fit >= top.fit - 0.18 && (V.cursoById[x.id].T.p || {})[k] >= 70)
        .sort((a, b) => b.fit - a.fit)[0];
      if (cand) { out.push({ eixo: txt, curso: V.cursoById[cand.id].nome, id: cand.id }); used.add(cand.id); }
      if (out.length >= 4) break;
    }
    return out;
  }

  /* ---------- Conflitos de perfil (hipóteses para investigar, nunca exclusões) ---------- */
  function conflitos(vec) {
    const hi = d => (vec[d] ?? 0) >= 64, lo = d => (vec[d] ?? 100) <= 40, out = [];
    const add = (texto, q) => out.push({ texto, pergunta: q });
    if ((hi('m_lideranca') || hi('w_lideranca') || hi('E')) && lo('w_competicao')) add('Você demonstra interesse por liderança, mas baixa preferência por ambientes competitivos.', 'Que tipos de liderança existem em ambientes mais colaborativos (coordenação, gestão de projetos, ensino)?');
    if ((hi('v_estabilidade') || hi('v_seguranca') || hi('m_seguranca')) && hi('w_empreend')) add('Você valoriza estabilidade e segurança, mas também mostrou abertura para empreender, o que costuma trazer renda incerta.', 'Qual nível de risco financeiro você aceitaria de verdade nos primeiros 3 anos?');
    if (hi('v_equilibrio') && (hi('m_desafio') || hi('w_pressao'))) add('Você busca desafios intensos, mas também quer equilíbrio entre vida e trabalho. Profissões muito desafiadoras costumam cobrar tempo.', 'Quantas horas por semana e quantos plantões/fins de semana você aceita trabalhar?');
    if (hi('S') && lo('b_ES')) add('Você demonstra grande interesse por ajudar pessoas, mas indicou menor estabilidade emocional sob pressão. Profissões de cuidado envolvem alta exposição emocional.', 'Como você reage ao sofrimento de outras pessoas? Já viveu situações assim de perto?');
    if ((hi('I') || hi('S')) && lo('w_hospitalar') && hi('p_pessoas')) add('Você tem interesse por ciência e pessoas, mas pouco conforto com o ambiente hospitalar.', 'Existem áreas de saúde ou psicologia que atuam fora de hospital (consultório, escola, empresa)?');
    if (hi('A') && (hi('v_estabilidade') || hi('v_seguranca'))) add('Você tem forte veia criativa, mas valoriza segurança. Carreiras criativas costumam ter renda mais irregular.', 'Como profissionais criativos se sustentam nos primeiros anos? Há caminhos criativos com mais estabilidade?');
    if (hi('w_individual') && (hi('S') || hi('p_pessoas'))) add('Você gosta de ajudar pessoas, mas prefere trabalhar sozinho em boa parte do tempo.', 'Quais funções permitem contato individual (consultório, mentoria) em vez de público constante?');
    if (hi('w_remoto') && (hi('S') || hi('E') || hi('w_publico'))) add('Você tem interesse por pessoas ou liderança, mas preferência por trabalho remoto.', 'Quais dessas carreiras funcionam bem à distância e quais exigem presença?');
    if (hi('I') && lo('a_mat') && hi('p_numeros') === false && (hi('p_tecnologia') || hi('R'))) add('Você demonstra interesse analítico, mas pouca afinidade com matemática, que costuma ser base de cursos técnicos.', 'Quanta matemática exigem os cursos que você considera, nos primeiros dois anos?');
    const pares = [['R', 'e_R', 'atividades práticas'], ['I', 'e_I', 'análise e estudo'], ['A', 'e_A', 'criação'], ['S', 'e_S', 'lidar com pessoas'], ['E', 'e_E', 'liderar e persuadir'], ['C', 'e_C', 'organização e precisão']];
    for (const [i, e, n] of pares) if (hi(i) && lo(e)) add(`Você tem alto interesse por ${n}, mas pouca confiança em ${n}. Isso pode ser falta de experiência.`, 'Qual experiência prática (curso curto, voluntariado, projeto) poderia testar essa confiança antes da decisão?');
    if (lo('c_confianca') || lo('c_controle')) add('Você indicou dúvidas sobre a própria capacidade de concluir um curso exigente ou de influenciar sua carreira.', 'Que apoios (orientação, tutoria, estudo em grupo) fariam diferença na sua trajetória?');
    return out.slice(0, 6);
  }

  V.engine = { PESOS, buildOrder, score, reliability, recommend, areaMap, relacao, seVoce, conflitos, evalCourse, acquiescence, accumulate, courseTargets };
})();
