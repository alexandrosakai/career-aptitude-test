/* Interface do teste: uma pergunta por tela, progresso salvo no aparelho, resultado calculado no navegador. */
(function () {
  const V = globalThis.VOC;
  const KEY = 'voc_estado_v1';
  const app = document.getElementById('app');
  const prog = document.getElementById('prog'), bar = document.getElementById('progbar'), progtxt = document.getElementById('progtxt');
  let curKey = null;
  document.addEventListener('keydown', ev => { if (curKey && /^[1-5]$/.test(ev.key) && !ev.target.matches('input,select,textarea')) curKey(+ev.key); });
  let S = null, S0 = null, t0 = 0, hiddenAt = 0, hiddenAcc = 0;

  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* modo privado: segue sem salvar */ } },
    del() { try { localStorage.removeItem(KEY); } catch (e) {} },
  };
  async function api(method, path, body, q) {
    try {
      const r = await fetch('api/' + path + (q || ''), { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      let data = {}; try { data = await r.json(); } catch (e) { /* sem corpo */ }
      return { ok: r.ok, status: r.status, data };
    } catch (e) { return { ok: false, status: 0, data: {} }; }
  }
  async function garantirServidor() {
    if (S.srv) return true;
    if (!S.perfil || !S.perfil.email) return false;
    const r = await api('POST', 'testes', S.perfil);
    if (r.ok) { S.srv = { id: r.data.id, token: r.data.token }; store.set(S); return true; }
    return false;
  }
  let enviandoAgora = false;
  async function enviarFinal() {
    enviandoAgora = true; try { await enviarFinal2(); } finally { enviandoAgora = false; }
  }
  async function enviarFinal2() {
    S.sync = 'enviando'; store.set(S); pintarSync();
    if (!(await garantirServidor())) { S.sync = 'erro'; store.set(S); pintarSync(); return; }
    const r = await api('PUT', 'testes/' + S.srv.id, { token: S.srv.token, progresso: S.order.length, respostas: S.ans, ordem: S.order });
    if (!r.ok) { S.sync = 'erro'; store.set(S); pintarSync(); return; }
    S.sync = 'ok'; store.set(S); pintarSync();
    for (let i = 0; i < 4; i++) { const e = await api('GET', 'testes/' + S.srv.id, null, '?token=' + encodeURIComponent(S.srv.token)); if (e.ok) { S.email = e.data; store.set(S); pintarSync(); if (e.data.email_status !== 'enviando') break; } await new Promise(r => setTimeout(r, 2500)); }
  }
  function pintarSync() {
    const el = document.getElementById('sync'); if (!el || !S) return;
    el.replaceChildren();
    if (S.sync === 'ok') {
      const e = S.email && S.email.email_status, m = S.email && S.email.email;
      el.append(h('b', null, 'Resultado salvo. '), e === 'enviado' ? `Uma cópia foi enviada para ${m}.` : e === 'erro' || e === 'bloqueado' ? 'Não foi possível enviar a cópia por e-mail, mas seu resultado está salvo e aparece aqui.' : `Sua cópia será enviada para ${m || 'o e-mail informado'} em breve.`);
    } else if (S.sync === 'erro') {
      el.append(h('b', null, 'Não conseguimos salvar seu resultado no servidor. '), 'Seu resultado continua aqui no aparelho. ', h('button', { class: 'btn inline', onclick: enviarFinal }, 'Tentar de novo'));
    } else el.append('Salvando seu resultado…');
  }
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in (attrs || {})) {
      if (k === 'class') el.className = attrs[k]; else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) el.setAttribute(k, ''); else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
    kids.flat(Infinity).forEach(c => { if (c == null || c === false) return; el.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  }
  const clear = () => { app.replaceChildren(); window.scrollTo(0, 0); };
  const setProg = (i, n, txt) => { prog.hidden = progtxt.hidden = i == null; if (i != null) { bar.style.width = (100 * i / n) + '%'; progtxt.textContent = txt; } };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now(); else if (hiddenAt) { hiddenAcc += Date.now() - hiddenAt; hiddenAt = 0; }
  });

  /* ---------- Intro ---------- */
  function intro() {
    clear(); setProg(null);
    const saved = store.get();
    const ok = h('input', { type: 'checkbox', id: 'ok' });
    const nome = h('input', { type: 'text', id: 'nome', class: 'inp', maxlength: 80, autocomplete: 'given-name', placeholder: 'Seu nome' });
    const email = h('input', { type: 'email', id: 'email', class: 'inp', maxlength: 120, autocomplete: 'email', placeholder: 'user@example.com' });
    const idade = h('input', { type: 'number', id: 'idade', class: 'inp', min: 10, max: 99, inputmode: 'numeric', placeholder: 'Sua idade' });
    const pick = (n, obrig) => {
      const sel = h('select', { class: 'inp', id: 'curso' + n }, h('option', { value: '' }, obrig ? 'Escolha um curso…' : 'Terceiro curso (opcional)…'),
        Object.keys(V.areas).map(a => h('optgroup', { label: V.areas[a] }, V.cursos.filter(c => c.area === a).sort((x, y) => x.nome.localeCompare(y.nome, 'pt')).map(c => h('option', { value: c.id }, c.nome)))),
        h('option', { value: 'outro' }, 'Outro (não está na lista)'));
      const txt = h('input', { type: 'text', class: 'inp', maxlength: 80, placeholder: 'Qual curso?', hidden: true });
      sel.addEventListener('change', () => { txt.hidden = sel.value !== 'outro'; check(); });
      return { sel, txt, el: h('div', null, sel, txt) };
    };
    const pes = h('input', { type: 'checkbox', id: 'pes' });
    const erroBox = h('div', { class: 'alert', hidden: true });
    const c1 = pick(1, true), c2 = pick(2, true), c3 = pick(3, false);
    const menor = h('label', { class: 'chk', hidden: true }, h('input', { type: 'checkbox', id: 'resp' }), h('span', null, 'Tenho menos de 18 anos e meu responsável sabe que vou fazer o teste.'));
    const go = h('button', { class: 'btn primary', disabled: true, onclick: async () => {
      if (saved && (saved.result || Object.keys(saved.ans || {}).length) && !confirm('Começar um novo teste vai substituir o resultado ou o progresso salvo neste aparelho. Continuar?')) return;
      const lst = [c1, c2, c3].filter(c => c.sel.value).map(c => c.sel.value === 'outro' ? { texto: c.txt.value.trim() } : { id: c.sel.value });
      S0 = { nome: nome.value.trim(), idade: +idade.value, email: email.value.trim().toLowerCase(), cursos: lst, consent: { armazenar: true, pesquisa: pes.checked, responsavel: !menor.hidden && menor.querySelector('input').checked } };
      go.disabled = true; go.textContent = 'Preparando…'; erroBox.hidden = true;
      const r = await api('POST', 'testes', S0);
      if (r.ok) S0.srv = { id: r.data.id, token: r.data.token };
      else if (r.status === 400 || r.status === 429) { erroBox.textContent = r.data.erro || 'Não foi possível iniciar.'; erroBox.hidden = false; go.textContent = 'Começar o teste'; go.disabled = false; return; }
      start(false);
    } }, 'Começar o teste');
    function check() {
      const age = +idade.value, v = [c1, c2].map(c => c.sel.value);
      menor.hidden = !(age > 0 && age < 18);
      const okCurso = c => c.sel.value && (c.sel.value !== 'outro' || c.txt.value.trim().length > 1);
      const dup = c1.sel.value && c1.sel.value !== 'outro' && (c1.sel.value === c2.sel.value || c1.sel.value === c3.sel.value || (c3.sel.value && c2.sel.value === c3.sel.value));
      go.disabled = !(ok.checked && nome.value.trim().length > 1 && /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email.value.trim()) && age >= 10 && age <= 99 && okCurso(c1) && okCurso(c2) && (!c3.sel.value || okCurso(c3)) && !dup && (menor.hidden || menor.querySelector('input').checked));
    }
    [ok, nome, email, idade, c1.txt, c2.txt, c3.txt, menor.querySelector('input')].forEach(e => e.addEventListener('input', check));
    ok.addEventListener('change', check);
    app.append(
      h('div', { class: 'card' },
        h('h1', null, 'Descubra áreas e cursos para explorar'),
        h('p', null, 'Este teste ajuda você a refletir sobre interesses, jeito de trabalhar, valores e ambientes que combinam com você, e sugere áreas e cursos para investigar.'),
        h('p', { class: 'mut' }, `São ${V.items.length} perguntas rápidas, em cerca de 25 a 30 minutos. Seu progresso fica salvo e você pode continuar depois. Responda com sinceridade: não há resposta certa.`),
        h('div', { class: 'disc' }, h('b', null, 'Importante: '), 'isto não é um teste psicológico nem um diagnóstico, e não diz qual é a sua profissão ideal. O resultado é uma hipótese de compatibilidade para você pesquisar e conversar com quem entende do assunto.'),
        h('div', { class: 'disc' }, h('b', null, 'Privacidade: '), 'guardamos seu nome, idade, e-mail, cursos de interesse, respostas e resultado no servidor da Empresa Exemplo, para enviar uma cópia do resultado ao seu e-mail e acompanhar o teste. Você pode apagar tudo pelo botão "Apagar meus dados". ', h('a', { href: 'privacidade.html', target: '_blank', rel: 'noopener' }, 'Leia o aviso de privacidade'), '.'),
        h('h3', null, 'Antes de começar'),
        h('label', { class: 'mut small' }, 'Seu nome'), nome, h('label', { class: 'mut small' }, 'Sua idade'), idade, h('label', { class: 'mut small' }, 'Seu e-mail (enviaremos uma cópia do resultado)'), email,
        h('p', { class: 'mut small', style: 'margin-top:.8rem' }, 'Quais cursos você já pensa em fazer? Escolha pelo menos 2. No final, mostramos se eles apareceram no seu resultado.'),
        c1.el, c2.el, c3.el, menor,
        h('label', { class: 'chk' }, ok, h('span', null, 'Li o aviso de privacidade e autorizo guardar meus dados e enviar uma cópia do resultado para o e-mail informado.')),
        h('label', { class: 'chk' }, pes, h('span', { class: 'mut small' }, '(Opcional) Autorizo usar minhas respostas, sem nome e sem e-mail, em pesquisa para melhorar o teste.')),
        erroBox,
        go,
        saved && saved.order && !saved.result && Object.keys(saved.ans || {}).length ? h('button', { class: 'btn ghost', onclick: () => start(true) }, `Continuar de onde parei (${Object.keys(saved.ans).length} de ${V.items.length})`) : null,
        saved && saved.result ? h('button', { class: 'btn ghost', onclick: () => { S = saved; result(); } }, 'Ver meu último resultado') : null));
  }

  function start(resume) {
    S = resume ? store.get() : null;
    if (!S) { const seed = (Math.random() * 2 ** 31) | 0; S = { seed, order: V.engine.buildOrder(seed), ans: {}, i: 0, t: Date.now(), perfil: S0 && { nome: S0.nome, idade: S0.idade, email: S0.email, cursos: S0.cursos, consent: S0.consent }, srv: S0 && S0.srv }; store.set(S); }
    S.i = Math.min(S.i || 0, S.order.length - 1);
    question();
  }

  /* módulo "do bloco": itens de controle herdam o módulo do vizinho, para não revelar o que é controle */
  function blockMod(i) {
    for (let j = i; j >= 0; j--) { const it = V.itemById[S.order[j]]; if (it.m !== 9) return it.m; }
    for (let j = i; j < S.order.length; j++) { const it = V.itemById[S.order[j]]; if (it.m !== 9) return it.m; }
    return 1;
  }
  function perm(it) { // ordem das opções embaralhada de forma determinística por pessoa e item
    const n = it.opts.length, idx = [...Array(n).keys()];
    let a = (S.seed + [...it.id].reduce((s, c) => s * 31 + c.charCodeAt(0), 7)) >>> 0;
    for (let i = n - 1; i > 0; i--) { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; const j = a % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx;
  }

  function question() {
    const n = S.order.length;
    if (S.i >= n) return finish();
    const it = V.itemById[S.order[S.i]], bm = blockMod(S.i);
    S.seen = S.seen || {};
    if (!S.seen[bm] && !S.ans[it.id]) { S.seen[bm] = 1; store.set(S); return interstitial(bm); }
    clear();
    setProg(S.i, n, `Parte ${bm} de 8 · pergunta ${S.i + 1} de ${n}`);
    const cur = S.ans[it.id]?.v;
    const opts = [];
    const choose = (v) => {
      const t = Math.max(0, Date.now() - t0 - hiddenAcc);
      S.ans[it.id] = { v, t }; S.i++; store.set(S);
      if (S.srv && S.i % 10 === 0) api('PUT', 'testes/' + S.srv.id, { token: S.srv.token, progresso: S.i });
      setTimeout(() => question(), 180);
    };
    if (it.t === 'L') V.scales[it.sc].forEach((lab, k) => opts.push(h('button', { class: 'btn' + (cur === k + 1 ? ' sel' : ''), 'aria-pressed': String(cur === k + 1), title: 'Tecla ' + (k + 1), onclick: () => choose(k + 1) }, lab)));
    else perm(it).forEach(k => opts.push(h('button', { class: 'btn' + (cur === k ? ' sel' : ''), onclick: () => choose(k) }, it.opts[k].x)));
    const hint = it.t === 'L' ? ({ rx: 'Como você se sentiria?', cc: 'O quanto isso combina com você?', ef: 'Como você se sairia?', im: 'Quão importante?', fr: 'Com que frequência?' })[it.sc] : 'Escolha a opção que mais combina com você.';
    app.append(h('div', { class: 'card' },
      h('div', { class: 'mod' }, V.modulos[bm].nome),
      h('p', { class: 'q', tabindex: '-1', id: 'q' }, it.q), h('p', { class: 'mut small' }, hint), ...opts,
      h('div', { class: 'nav' }, S.i > 0 ? h('button', { class: 'btn ghost', onclick: () => { S.i--; store.set(S); question(); } }, '← Voltar') : null,
        h('button', { class: 'btn ghost', onclick: () => { store.set(S); intro(); } }, 'Pausar'))));
    t0 = Date.now(); hiddenAcc = 0; hiddenAt = document.hidden ? Date.now() : 0;
    const qe = document.getElementById('q'); if (qe) qe.focus({ preventScroll: true });
    curKey = it.t === 'L' ? (k => { const b = app.querySelectorAll('.card .btn:not(.ghost)')[k - 1]; if (b) b.click(); }) : null;
  }

  function interstitial(m) {
    clear(); setProg(S.i, S.order.length, `Parte ${m} de 8`);
    app.append(h('div', { class: 'card' },
      h('div', { class: 'mod' }, `Parte ${m} de 8`), h('h1', null, V.modulos[m].nome), h('p', null, V.modulos[m].desc),
      h('button', { class: 'btn primary', onclick: () => question() }, 'Continuar')));
  }

  function finish() {
    clear(); setProg(null);
    const sc = V.engine.score(S.ans);
    const rel = V.engine.reliability(S.ans, S.order, sc.acq);
    const rec = V.engine.recommend(sc.vec, rel);
    const res = { vec: sc.vec, rel, rec, areas: V.engine.areaMap(rec.all), conflitos: V.engine.conflitos(sc.vec), seVoce: V.engine.seVoce(rec, sc.vec) };
    S.result = V.report.build(res, S.perfil); S.done = Date.now(); store.set(S);
    result(); enviarFinal();
  }

  /* ---------- Resultado ---------- */
  const bars = (list, key) => list.map(x => h('div', { class: 'bar' }, h('span', null, x.nome), h('span', { class: 't' }, h('i', { style: `width:${x.v ?? x.pct}%` })), h('b', null, x.v ?? x.pct)));
  const ul = a => h('ul', null, a.map(x => h('li', null, x)));
  const chips = a => h('div', { class: 'chips' }, a.map(x => h('span', null, x)));
  const sec = (id, title, ...kids) => h('section', { class: 'card', id }, h('h2', null, title), kids);

  function result() {
    clear(); setProg(null);
    const R = S.result; if (!R) return intro();
    if (S.sync === 'enviando' && !enviandoAgora) { S.sync = 'erro'; store.set(S); }
    setTimeout(pintarSync, 0);
    const nav = [['resumo', 'Resumo'], ['areas', 'Áreas'], ['top3', 'Top 3'], ...(S.result.comparacao ? [['comp', 'Seus cursos']] : []), ['alt', 'Alternativos'], ['conflitos', 'Conflitos'], ['pesquisar', 'Pesquisar'], ['passos', 'Próximos passos']];
    app.append(
      h('div', { class: 'sticky-nav noprint' }, nav.map(([id, t]) => h('a', { href: '#' + id }, t))),
      R.perfil ? h('p', { class: 'mut' }, `Resultado de ${R.perfil.nome}, ${R.perfil.idade} anos`) : null,
      h('div', { class: 'disc noprint', id: 'sync' }),
      h('div', { class: 'disc' }, R.aviso),
      sec('conf', '1. Confiabilidade da avaliação', h('p', null, h('span', { class: 'tag ' + R.confiabilidade.nivel }, R.confiabilidade.nivel), ` (índice ${R.confiabilidade.score}/100)`), h('p', null, R.confiabilidade.texto),
        R.confiabilidade.sinais.length ? h('details', null, h('summary', null, 'Ver sinais observados'), h('ul', { class: 'flags' }, R.confiabilidade.sinais.map(s => h('li', null, s)))) : null),
      sec('resumo', '2. Resumo do perfil', h('p', null, R.resumo),
        h('h3', null, 'Principais interesses'), ...bars(R.interesses), h('h3', null, 'Atividades que mais combinam'), ...bars(R.prefs),
        h('h3', null, 'Jeito de agir (personalidade)'), ...bars(R.big5)),
      sec('valores', '3. Valores e 4. Motivadores', h('h3', null, 'O que mais pesa nas suas escolhas'), ...bars(R.valores), h('h3', null, 'O que mais te move'), ...bars(R.motivadores)),
      sec('estilo', '5. Estilo de trabalho', R.estilo.alto.length ? h('p', null, h('b', null, 'Você demonstrou conforto com:')) : null, R.estilo.alto.length ? ul(R.estilo.alto) : null,
        R.estilo.baixo.length ? h('p', null, h('b', null, 'Você demonstrou menos conforto com:')) : null, R.estilo.baixo.length ? ul(R.estilo.baixo) : null,
        h('details', null, h('summary', null, 'Ver todas as preferências de ambiente'), ...bars(R.estilo.todos))),
      sec('fortes', '6. Pontos fortes e 7. Pontos de atenção', R.fortes.length ? ul(R.fortes) : h('p', { class: 'mut' }, 'Nenhum ponto se destacou muito acima da média.'),
        h('h3', null, 'Pontos de atenção'), R.atencao.length ? ul(R.atencao) : h('p', { class: 'mut' }, 'Nenhum ponto de atenção marcante.')),
      sec('areas', '8. Áreas mais compatíveis', h('p', { class: 'mut small' }, 'Compatibilidade com o perfil avaliado. Não é probabilidade de sucesso profissional.'), ...bars(R.areas)),
      h('h2', { id: 'top3' }, '9. Top 3 cursos para investigar'),
      R.confiabilidade.nivel === 'Baixa' ? h('div', { class: 'alert' }, 'Como a confiabilidade desta avaliação foi baixa, trate a lista abaixo apenas como exploração inicial e considere refazer o teste.') : null,
      ...R.top3.map(courseCard),
      R.comparacao ? sec('comp', 'Seus cursos de interesse × resultado do teste', h('p', null, R.comparacao.resumo),
        R.comparacao.itens.map(i => i.fora ? h('div', { class: 'alert' }, h('b', null, i.nome), ': ', i.status) : h('div', { class: 'card', style: 'margin:.5rem 0' },
          h('h3', { style: 'margin-top:0' }, i.nome, ' ', h('span', { class: 'tag ' + (i.bateu ? 'Alta' : 'Média') }, i.pct + '%')),
          h('p', { class: 'small' }, `${i.status} (posição ${i.pos} de ${i.total}; ${i.faixa.toLowerCase()}).`),
          i.alertas.map(a => h('div', { class: 'alert' }, a)),
          i.positivos.length ? h('p', { class: 'small' }, h('b', null, 'A favor: '), i.positivos.slice(0, 3).join('; ') + '.') : null,
          i.atencao.length ? h('p', { class: 'small' }, h('b', null, 'Pontos de atenção: '), i.atencao.slice(0, 3).join('; ') + '.') : null)),
        h('p', { class: 'mut small' }, 'Se um curso que você ama ficou mais abaixo, isso não é uma proibição: indica que vale investigar o que o teste apontou de diferente. O contrário também vale: um curso bem colocado ainda precisa de pesquisa.')) : null,
      sec('alt', '10. Cursos alternativos', h('table', { style: 'width:100%;border-collapse:collapse;font-size:.92rem' }, R.alternativos.map(a => h('tr', null, h('td', { style: 'padding:.3rem 0' }, a.nome, h('span', { class: 'mut small' }, ' · ' + a.area)), h('td', { style: 'text-align:right;font-weight:700' }, a.pct + '%')))),
        R.seVoce.length ? h('h3', null, 'Se você quiser mudar a ênfase') : null, R.seVoce.length ? ul(R.seVoce.map(s => `Se você quer ${s.eixo}, considere ${s.curso}.`)) : null),
      sec('prof', '11. Profissões relacionadas e 12. Ambientes compatíveis', chips(R.profissoes), h('h3', null, 'Ambientes profissionais'), chips(R.ambientes)),
      sec('conflitos', '13. Possíveis conflitos', h('p', { class: 'mut small' }, 'São pontos para investigar, não exclusões. Eles não dizem que um caminho é impossível.'),
        R.conflitos.length ? R.conflitos.map(c => h('div', { class: 'alert' }, c.texto, h('div', { class: 'small mut' }, 'Para investigar: ' + c.pergunta))) : h('p', null, 'Nenhum conflito relevante apareceu no seu perfil.')),
      sec('pesquisar', '14. O que pesquisar antes de escolher', ul(R.pesquisarGeral)),
      sec('passos', '15. Próximos passos', ul(R.proximos)),
      h('div', { class: 'card noprint' },
        h('button', { class: 'btn inline primary', onclick: () => window.print() }, 'Imprimir / salvar PDF'),
        h('button', { class: 'btn inline', onclick: baixar }, 'Baixar meus dados (JSON)'),
        h('button', { class: 'btn inline', onclick: async () => { if (confirm('Isso apaga suas respostas e seu resultado deste aparelho e do servidor. Continuar?')) { if (S.srv) { const r = await api('DELETE', 'testes/' + S.srv.id, null, '?token=' + encodeURIComponent(S.srv.token)); if (!r.ok && r.status !== 404) { alert('Não foi possível apagar no servidor agora. Tente de novo em instantes.'); return; } } store.del(); S = null; intro(); } } }, 'Apagar meus dados'),
        h('button', { class: 'btn inline', onclick: intro }, 'Início')));
  }

  function courseCard(c) {
    return h('section', { class: 'card course' },
      h('div', { class: 'mod' }, `Opção ${c.pos} · ${c.area} · cerca de ${c.anos} anos`),
      h('h2', null, c.nome), h('div', { style: 'display:flex;gap:.8rem;align-items:baseline' }, h('span', { class: 'pct' }, c.pct + '%'), h('span', { class: 'mut' }, S.result.confiabilidade.nivel === 'Baixa' ? 'Resultado exploratório (confiabilidade baixa)' : c.faixa)),
      h('p', { class: 'small mut' }, `Entre as opções avaliadas, ${c.nome} apresentou ${c.pos === 1 ? 'a maior compatibilidade' : 'compatibilidade relevante'} com seu conjunto de interesses, preferências e características, principalmente por ${c.porque.join(', ')}. Isto é uma hipótese a investigar, não uma certeza.`),
      c.relacao ? h('p', null, h('b', null, 'Relação com a 1ª opção: '), c.relacao) : null,
      c.alertas.map(a => h('div', { class: 'alert' }, a)),
      h('h3', null, 'Principais fatores positivos'), c.positivos.length ? ul(c.positivos) : h('p', { class: 'mut' }, 'Compatibilidade distribuída, sem um fator isolado muito forte.'),
      c.atencao.length ? [h('h3', null, 'Possíveis pontos de atenção'), ul(c.atencao)] : null,
      h('details', null, h('summary', null, 'Como é o curso e a atuação'),
        h('h3', null, 'Ambientes compatíveis'), chips(c.ambientes), h('h3', null, 'Áreas de atuação'), chips(c.atuacao), h('h3', null, 'Profissões'), chips(c.profissoes),
        h('h3', null, 'Competências importantes'), chips(c.competencias), h('h3', null, 'Perfil acadêmico'), h('p', null, c.req), h('h3', null, 'Possíveis desafios'), h('p', null, c.desafios),
        h('h3', null, 'Realidade do dia a dia'), h('p', null, c.real)),
      h('details', null, h('summary', null, 'Perguntas para você investigar'), ul(c.perguntas)));
  }

  function baixar() {
    const blob = new Blob([JSON.stringify({ geradoEm: new Date().toISOString(), versaoModelo: 'conceitual-0.1', resultado: S.result, respostas: S.ans }, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'meu-resultado-vocacional.json' }); document.body.append(a); a.click(); a.remove();
  }

  intro();
})();
