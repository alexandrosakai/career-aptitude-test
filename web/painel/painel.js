(function () {
  const root = document.getElementById('p');
  const A = '../api/admin/';
  async function api(m, p, b) {
    const r = await fetch(A + p, { method: m, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'painel' }, body: b ? JSON.stringify(b) : undefined });
    let d = {}; try { d = await r.json(); } catch (e) { /* csv etc. */ }
    return { ok: r.ok, status: r.status, d };
  }
  function h(tag, at, ...kids) {
    const el = document.createElement(tag);
    for (const k in (at || {})) { if (k.startsWith('on')) el.addEventListener(k.slice(2), at[k]); else if (at[k] === true) el.setAttribute(k, ''); else if (at[k] != null && at[k] !== false) el.setAttribute(k, at[k]); }
    kids.flat(Infinity).forEach(c => { if (c == null || c === false) return; el.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  }
  const mount = (...k) => root.replaceChildren(...k.flat(Infinity).filter(x => x != null && x !== false));
  const fd = s => s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const bd = (txt, cls) => h('span', { class: 'b ' + cls }, txt);
  const cf = n => n ? bd(n, n === 'Alta' ? 'ok' : n === 'Média' ? 'md' : 'ru') : '—';
  const ems = { enviado: bd('enviado', 'ok'), pendente: bd('na fila', 'md'), enviando: bd('enviando', 'md'), erro: bd('erro', 'ru'), bloqueado: bd('bloqueado', 'cz') };
  let filtro = { q: '', status: '' };

  async function entrar() {
    root.replaceChildren();
    const s = h('input', { type: 'password', class: 'inp', placeholder: 'Senha do painel', autocomplete: 'current-password' });
    const er = h('div', { class: 'alert', hidden: true });
    const go = async () => { er.hidden = true; const r = await api('POST', 'login', { senha: s.value }); if (r.ok) painel(); else { er.textContent = r.d.erro || 'Erro'; er.hidden = false; } };
    s.addEventListener('keydown', e => e.key === 'Enter' && go());
    root.append(h('div', { class: 'card', style: 'max-width:380px;margin:2rem auto' }, h('h1', null, 'Entrar'), s, er, h('button', { class: 'btn primary', onclick: go }, 'Entrar')));
    s.focus();
  }

  async function painel() {
    const ses = await api('GET', 'sessao'); if (!ses.ok) return entrar();
    const [rs, ls] = await Promise.all([api('GET', 'resumo'), api('GET', 'testes?q=' + encodeURIComponent(filtro.q) + '&status=' + filtro.status)]);
    if (!rs.ok) return entrar();
    const R = rs.d, L = ls.d;
    const k = (v, t) => h('div', { class: 'kpi' }, h('b', null, v == null ? '—' : v), h('span', null, t));
    const q = h('input', { class: 'inp', placeholder: 'Buscar nome, e-mail ou curso', value: filtro.q, style: 'min-width:220px' });
    const st = h('select', { class: 'inp' }, [['', 'Todos'], ['concluido', 'Concluídos'], ['iniciado', 'Em andamento']].map(([v, t]) => h('option', { value: v, selected: filtro.status === v }, t)));
    const aplicar = () => { filtro = { q: q.value, status: st.value }; painel(); };
    q.addEventListener('keydown', e => e.key === 'Enter' && aplicar()); st.addEventListener('change', aplicar);
    mount(
      !R.smtp ? h('div', { class: 'alert' }, h('b', null, 'E-mail ainda não configurado. '), `Os resultados estão sendo guardados, mas ${R.emails.pendente} cópia(s) aguardam na fila. Quando o SMTP for configurado, o envio é automático.`) : null,
      h('div', { class: 'kpis' }, k(R.total, 'testes iniciados'), k(R.concluidos, 'concluídos'), k(R.taxa_conclusao == null ? null : R.taxa_conclusao + '%', 'taxa de conclusão'),
        k(R.tempo_mediano_min == null ? null : R.tempo_mediano_min + ' min', 'tempo mediano'), k(R.idade_mediana, 'idade mediana'),
        k(R.hit_top3 == null ? null : R.hit_top3 + '%', `citaram curso que ficou no Top 3 (de ${R.n_com_citados})`), k(R.hit_top10 == null ? null : R.hit_top10 + '%', 'citaram curso no Top 10'),
        k(`${R.confiab['Alta']} / ${R.confiab['Média']} / ${R.confiab['Baixa']}`, 'confiabilidade alta / média / baixa')),
      h('p', { class: 'mut small' }, 'Os índices de "bateu" são indícios, não prova de validade: quem cita um curso pode estar influenciado por pressão, desinformação ou pelo próprio teste.'),
      h('div', { class: 'bar2' }, q, st, h('button', { class: 'btn inline', onclick: aplicar }, 'Buscar'),
        h('a', { class: 'btn inline', href: A + 'exportar.csv' }, 'Exportar CSV'), h('a', { class: 'btn inline', href: A + 'exportar-pesquisa.json' }, 'Exportar pesquisa (anonimizado)'),
        h('button', { class: 'btn inline', onclick: async () => { await api('POST', 'logout'); entrar(); } }, 'Sair')),
      h('div', { class: 'tw' }, h('table', { class: 't' },
        h('thead', null, h('tr', null, ['Data', 'Nome', 'Idade', 'E-mail', 'Situação', 'Confiab.', 'Cursos citados', 'Top 3 do teste', 'Bateu?', 'E-mail'].map(c => h('th', null, c)))),
        h('tbody', null, L.length ? L.map(r => h('tr', { class: 'l', onclick: () => detalhe(r.id) },
          h('td', null, fd(r.criado_em)), h('td', null, r.nome), h('td', null, r.idade), h('td', null, r.email),
          h('td', null, r.status === 'concluido' ? bd('concluído', 'ok') : bd(`${Math.round(100 * r.progresso / 184)}%`, 'cz')), h('td', null, cf(r.confiab)),
          h('td', null, r.cursos.join(', ')), h('td', null, r.top3.map(t => `${t.nome} ${t.pct}%`).join(' · ') || '—'),
          h('td', null, r.status !== 'concluido' ? '—' : r.hit_top3 ? bd('Top 3', 'ok') : r.hit_top10 ? bd('Top 10', 'md') : r.n_citados ? bd('não', 'ru') : '—'),
          h('td', null, r.status === 'concluido' ? (ems[r.email_status] || r.email_status) : '—'))) : h('tr', null, h('td', { colspan: 10, class: 'mut' }, 'Nenhum teste ainda.'))))));
  }

  async function detalhe(id) {
    const r = await api('GET', 'testes/' + id); if (!r.ok) return painel();
    const d = r.d, R = d.resultado;
    const sec = (t, ...k) => h('div', { class: 'card' }, h('h2', null, t), k);
    const ul = a => h('ul', null, a.map(x => h('li', null, x)));
    mount(
      h('button', { class: 'btn inline', onclick: painel }, '← Voltar'),
      sec(`${d.nome}, ${d.idade} anos`, h('p', null, d.email, ' · criado em ', fd(d.criado_em), ' · ', d.status === 'concluido' ? 'concluído em ' + fd(d.concluido_em) : `em andamento (${d.progresso}/184)`),
        h('p', null, 'Cursos citados: ', h('b', null, d.cursos.join(', '))), h('p', null, 'Autorizou pesquisa anonimizada: ', d.pesquisa ? 'sim' : 'não', ' · E-mail: ', ems[d.email_status] || d.email_status, d.email_erro ? ` (${d.email_erro})` : ''),
        h('button', { class: 'btn inline', onclick: async () => { const x = await api('POST', `testes/${id}/reenviar`); alert(x.ok ? 'Situação: ' + x.d.email_status + (x.d.erro ? ' — ' + x.d.erro : '') : (x.d.erro || 'Erro')); detalhe(id); } }, 'Reenviar e-mail'),
        h('button', { class: 'btn inline', onclick: async () => { if (confirm('Apagar este teste e todos os dados dele? Não dá para desfazer.')) { await api('DELETE', 'testes/' + id); painel(); } } }, 'Apagar teste')),
      R ? [
        sec('Confiabilidade', h('p', null, cf(R.confiabilidade.nivel), ` índice ${R.confiabilidade.score}/100 · tempo total ${d.tempo_total_ms ? Math.round(d.tempo_total_ms / 60000) + ' min' : '—'}`), R.confiabilidade.sinais.length ? ul(R.confiabilidade.sinais) : null),
        sec('Resumo do perfil', h('p', null, R.resumo), h('p', { class: 'mut' }, 'Áreas: ' + R.areas.slice(0, 5).map(a => `${a.nome} ${a.pct}%`).join(' · '))),
        sec('Top 3', R.top3.map(t => h('p', null, h('b', null, `${t.pos}. ${t.nome} — ${t.pct}%`), ' ', t.faixa, t.alertas.length ? h('span', { class: 'mut small' }, ' · alertas: ' + t.alertas.length) : null))),
        R.comparacao ? sec('Cursos citados × resultado', h('p', null, R.comparacao.resumo), ul(R.comparacao.itens.map(i => i.fora ? `${i.nome}: fora do banco` : `${i.nome}: posição ${i.pos}/${i.total}, ${i.pct}% — ${i.status}`))) : null,
        R.conflitos.length ? sec('Possíveis conflitos', ul(R.conflitos.map(c => c.texto))) : null,
        sec('Dados completos (vetor e respostas)', h('details', null, h('summary', null, 'Ver JSON'), h('pre', { class: 'j' }, JSON.stringify({ vetor: R.vec, respostas: d.respostas }, null, 1)))),
      ] : sec('Teste ainda não concluído', h('p', { class: 'mut' }, 'Ainda não há resultado: a pessoa respondeu ' + d.progresso + ' de 184 perguntas.')));
    window.scrollTo(0, 0);
  }
  painel();
})();
