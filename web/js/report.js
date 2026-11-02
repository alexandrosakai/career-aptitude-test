/* Montagem do relatório (15 seções) a partir do resultado do motor. Linguagem simples; sempre "hipóteses de compatibilidade". */
(function () {
  const V = (globalThis.VOC = globalThis.VOC || {});
  const E = () => V.engine;
  const nm = d => V.dims[d].nome;
  const byGroup = (vec, g) => Object.keys(V.dims).filter(d => V.dims[d].g === g && vec[d] != null).map(d => ({ d, nome: nm(d), v: vec[d] }));
  const top = (a, n) => [...a].sort((x, y) => y.v - x.v).slice(0, n);
  const low = (a, n) => [...a].sort((x, y) => x.v - y.v).slice(0, n);
  const faixa = p => p >= 85 ? 'Compatibilidade muito alta' : p >= 75 ? 'Compatibilidade alta' : p >= 65 ? 'Compatibilidade moderada' : 'Compatibilidade parcial';

  function resumo(vec) {
    const frases = [];
    const r = top(byGroup(vec, 'riasec'), 2); r.forEach(x => frases.push(V.dims[x.d].hi));
    const p = top(byGroup(vec, 'pref'), 1)[0]; if (p && p.v >= 58) frases.push(V.dims[p.d].hi);
    const v = top(byGroup(vec, 'val'), 1)[0]; if (v && v.v >= 58) frases.push(V.dims[v.d].hi);
    const m = top(byGroup(vec, 'mot'), 1)[0]; if (m && m.v >= 58) frases.push(V.dims[m.d].hi);
    const b = top(byGroup(vec, 'big5'), 1)[0]; if (b && b.v >= 65) frases.push(V.dims[b.d].hi);
    if (!frases.length) return 'Seu perfil não mostrou preferências muito marcadas, o que é comum e pede mais exploração prática.';
    const last = frases.pop();
    return 'Seu perfil apresenta ' + (frases.length ? frases.join(', ') + ' e ' + last : last) + '.';
  }

  function comparar(rec, perfil) {
    if (!perfil || !perfil.cursos) return null;
    const itens = perfil.cursos.map(c => {
      if (c.id) {
        const idx = rec.all.findIndex(x => x.id === c.id), x = rec.all[idx], cur = V.cursoById[c.id];
        const status = idx < 3 && rec.top3.some(t => t.id === c.id) ? 'Está entre as 3 opções principais' : idx < 10 ? 'Está entre os 10 mais compatíveis' : 'Ficou fora dos 10 mais compatíveis';
        return { nome: cur.nome, pos: idx + 1, total: rec.all.length, pct: x.pct, faixa: faixa(x.pct), status, bateu: idx < 10, atencao: x.neg, alertas: x.alerts.map(a => a.texto), positivos: x.pos };
      }
      return { nome: c.texto, fora: true, status: 'Este curso não está no banco do teste, então não foi avaliado.' };
    });
    const avaliados = itens.filter(i => !i.fora);
    const top3 = itens.filter(i => i.status.startsWith('Está entre as 3')).length, top10 = avaliados.filter(i => i.bateu).length;
    return { itens, resumo: avaliados.length ? `Dos ${avaliados.length} curso(s) que você citou e que o teste avalia, ${top3} está(ão) entre as 3 principais e ${top10} entre os 10 mais compatíveis.` : 'Nenhum dos cursos citados está no banco do teste.' };
  }

  function build(result, perfil) {
    const { vec, rel, rec, areas, conflitos, seVoce } = result;
    const C = id => V.cursoById[id];

    const interesses = byGroup(vec, 'riasec').sort((a, b) => b.v - a.v);
    const prefs = top(byGroup(vec, 'pref'), 5);
    const big5 = byGroup(vec, 'big5');
    const valores = top(byGroup(vec, 'val'), 5);
    const motiv = top(byGroup(vec, 'mot'), 5);
    const ws = byGroup(vec, 'ws');
    const wsAlto = top(ws, 5).filter(x => x.v >= 66).map(x => 'Conforto com ' + nm(x.d).toLowerCase() + ' (' + x.v + ')');
    const wsBaixo = low(ws, 5).filter(x => x.v <= 38).map(x => 'Pouco conforto com ' + nm(x.d).toLowerCase() + ' (' + x.v + ')');

    const fortes = [];
    top([...byGroup(vec, 'eff'), ...byGroup(vec, 'big5'), ...byGroup(vec, 'adapt')], 12).filter(x => x.v >= 66).slice(0, 5)
      .forEach(x => fortes.push(cap(V.dims[x.d].hi) + ' (' + x.v + ')'));
    const atencao = [];
    [...byGroup(vec, 'eff'), ...byGroup(vec, 'big5'), ...byGroup(vec, 'adapt'), ...byGroup(vec, 'ctx').filter(x => x.d === 'x_pesquisa')]
      .filter(x => x.v <= 40).sort((a, b) => a.v - b.v).slice(0, 5).forEach(x => atencao.push(({
        b_ES: 'Estabilidade emocional sob pressão: pode ser importante desenvolver estratégias de manejo do estresse',
        b_C: 'Organização e prazos: carreiras muito estruturadas podem exigir método e rotina de estudo',
        c_curiosidade: 'Você ainda explorou pouco as carreiras possíveis: a pesquisa prática é seu próximo passo',
        c_confianca: 'Confiança para superar obstáculos: apoio e orientação podem ajudar',
        c_controle: 'Sensação de controle sobre a própria carreira: lembre que decisões de hoje podem ser revistas',
        x_pesquisa: 'Você conhece pouco as grades e a rotina dos cursos que considera: pesquise antes de decidir',
      })[x.d] || `${nm(x.d)} apareceu abaixo da média do seu perfil (${x.v}); vale observar na prática`));

    const top3 = rec.top3.map((x, i) => {
      const c = C(x.id);
      const ant = rec.top3[0];
      return {
        pos: i + 1, id: c.id, nome: c.nome, area: V.areas[c.area], pct: x.pct, faixa: faixa(x.pct), anos: c.anos,
        positivos: x.pos, atencao: [...x.neg], alertas: x.alerts.map(a => a.texto), forte: x.forte,
        ambientes: c.amb, atuacao: c.atu, profissoes: c.prof, competencias: c.comp, req: c.req, desafios: c.des, real: c.real,
        perguntas: perguntas(c),
        relacao: i === 0 ? null : E().relacao(ant, x, vec),
        porque: Object.entries(x.blocks).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([b]) => ({ interesses: 'seus interesses', eficacia: 'sua confiança nas atividades', valores: 'seus valores', estilo: 'seu estilo de trabalho', personalidade: 'seu jeito de agir', academico: 'seus gostos de estudo', motivadores: 'o que te motiva' })[b]),
      };
    });

    const alternativos = rec.alternativos.map(x => ({ id: x.id, nome: C(x.id).nome, area: V.areas[C(x.id).area], pct: x.pct }));
    const profs = [...new Set([...rec.top3.flatMap(x => C(x.id).prof.slice(0, 3)), ...rec.alternativos.slice(0, 3).flatMap(x => C(x.id).prof.slice(0, 1))])];
    const ambs = [...new Set(rec.top3.flatMap(x => C(x.id).amb))];

    const confiabTxt = {
      Alta: 'O padrão das suas respostas foi consistente e atento. O resultado tende a refletir bem o que você respondeu.',
      Média: 'Houve alguns sinais de pressa, de inconsistência ou de respostas muito favoráveis. Use o resultado com cautela e converse sobre ele.',
      Baixa: 'Houve muitos sinais de respostas pouco atentas ou inconsistentes. Considere refazer o teste com calma, em outro momento. Os resultados abaixo são apenas exploratórios.',
    }[rel.nivel];

    return {
      perfil: perfil ? { nome: perfil.nome, idade: perfil.idade } : null, comparacao: comparar(rec, perfil),
      aviso: 'Este teste é uma ferramenta de orientação educacional e profissional. Não é teste psicológico, não faz diagnóstico e não determina a profissão ideal. Os percentuais indicam compatibilidade com o perfil que você descreveu, não probabilidade de sucesso. O modelo ainda não passou por validação empírica.',
      confiabilidade: { nivel: rel.nivel, score: rel.score, texto: confiabTxt, sinais: rel.flags },
      resumo: resumo(vec), interesses, prefs, big5, valores, motivadores: motiv, estilo: { alto: wsAlto, baixo: wsBaixo, todos: ws.sort((a, b) => b.v - a.v) },
      fortes, atencao, areas, top3, alternativos, seVoce, profissoes: profs, ambientes: ambs,
      conflitos, pesquisarGeral: PESQUISAR, proximos: PROXIMOS, vec,
    };
  }

  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function perguntas(c) {
    return [
      `Você se imagina realizando as atividades de ${c.nome} todos os dias, por anos?`,
      `Você pesquisou como é a rotina real de quem trabalha nessa área? ${c.real}`,
      'Você conhece alguém que atua nessa profissão? Dá para conversar 20 minutos com essa pessoa?',
      'Você conhece a remuneração inicial e a de 5 anos depois, em fontes atuais e da sua região?',
      'Você sabe quais disciplinas vai encontrar? Compare as grades de duas instituições.',
      'Você gosta da profissão ou apenas da ideia da profissão?',
    ];
  }
  const PESQUISAR = [
    'Como é um dia comum (e um dia ruim) de quem trabalha nessas áreas?',
    'Quais disciplinas dos dois primeiros anos mais assustam ou empolgam você?',
    'Qual a nota de corte, a mensalidade e a duração real nas instituições que você consideraria?',
    'Como está o mercado de trabalho na sua região e a possibilidade de atuar remotamente?',
    'Há exigências para exercer (exame de ordem, conselho, residência, concurso)?',
    'Existem cursos próximos que levam ao mesmo tipo de trabalho com outro caminho (técnico, tecnólogo, outro bacharelado)?',
  ];
  const PROXIMOS = [
    'Converse com 2 ou 3 profissionais de cada uma das áreas sugeridas (20 minutos cada).',
    'Faça uma visita, um dia de observação ou um curso livre curto na área que mais chamou atenção.',
    'Leia a grade curricular dos cursos em duas instituições e marque o que você gostaria e o que evitaria.',
    'Revise os pontos de atenção e conflitos com alguém de confiança ou com um orientador profissional.',
    'Se possível, procure um psicólogo ou orientador profissional para aprofundar (este teste não substitui avaliação psicológica).',
    'Refaça o teste em alguns meses: interesses mudam, principalmente na juventude.',
  ];

  V.report = { build, faixa, PESQUISAR, PROXIMOS };
})();
