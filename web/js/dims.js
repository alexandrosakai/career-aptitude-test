/* Dimensões do modelo (MODELO CONCEITUAL — ainda não validado empiricamente).
   g = grupo; c = 1 se o grupo é centrado na média da pessoa (reduz viés de uso da escala);
   hi = o que um escore alto significa, em linguagem simples. */
(function () {
  const V = (globalThis.VOC = globalThis.VOC || {});

  const groups = {
    riasec: { nome: 'Interesses profissionais', c: 1 },
    big5: { nome: 'Personalidade', c: 0 },
    val: { nome: 'Valores profissionais', c: 1 },
    mot: { nome: 'Motivadores', c: 1 },
    pref: { nome: 'Preferências de atividade', c: 1 },
    ws: { nome: 'Estilo e ambiente de trabalho', c: 0 },
    eff: { nome: 'Autoeficácia percebida', c: 0 },
    acad: { nome: 'Preferências acadêmicas', c: 0 },
    adapt: { nome: 'Adaptabilidade de carreira', c: 0 },
    ctx: { nome: 'Contexto', c: 0 },
  };

  const dims = {};
  function D(g, key, nome, hi) { dims[key] = { g, nome, hi: hi || nome.toLowerCase() }; }

  // RIASEC (Holland)
  D('riasec', 'R', 'Prático/técnico', 'gosto por atividades práticas, com ferramentas, máquinas ou ao ar livre');
  D('riasec', 'I', 'Investigativo', 'forte orientação investigativa (analisar, descobrir, entender a fundo)');
  D('riasec', 'A', 'Criativo', 'forte veia criativa e de expressão');
  D('riasec', 'S', 'Social', 'orientação para ajudar, ensinar e cuidar de pessoas');
  D('riasec', 'E', 'Empreendedor', 'inclinação para liderar, persuadir e assumir riscos calculados');
  D('riasec', 'C', 'Organizacional', 'gosto por organização, método e precisão');

  // Big Five
  D('big5', 'b_O', 'Abertura a experiências', 'abertura a novas ideias e experiências');
  D('big5', 'b_C', 'Conscienciosidade', 'alta disciplina e capricho com prazos e detalhes');
  D('big5', 'b_E', 'Extroversão', 'energia em contato social e em ambientes movimentados');
  D('big5', 'b_A', 'Amabilidade', 'cooperação e sensibilidade com os outros');
  D('big5', 'b_ES', 'Estabilidade emocional', 'boa estabilidade emocional sob pressão');

  // Valores (Schwartz como referência conceitual)
  [['autonomia', 'Autonomia', 'valorização da autonomia'],
   ['estabilidade', 'Estabilidade', 'valorização de estabilidade e previsibilidade'],
   ['remuneracao', 'Remuneração', 'peso grande para o potencial de ganhos'],
   ['impacto', 'Impacto social', 'desejo de contribuir para a vida de outras pessoas'],
   ['prestigio', 'Prestígio', 'importância do reconhecimento social da profissão'],
   ['criatividade', 'Criatividade', 'desejo de criar e inventar no trabalho'],
   ['seguranca', 'Segurança', 'preferência por baixo risco'],
   ['lideranca', 'Liderança', 'desejo de decidir e conduzir os outros'],
   ['conhecimento', 'Conhecimento', 'valorização do estudo e do aprofundamento'],
   ['equilibrio', 'Equilíbrio vida/trabalho', 'prioridade para tempo pessoal e horários previsíveis'],
  ].forEach(([k, n, h]) => D('val', 'v_' + k, n, h));

  // Motivadores (inclui os três da Autodeterminação: autonomia, competência≈desafio+aprendizado, relacionamento)
  [['desafio', 'Desafios', 'busca por desafios que exigem o máximo de você'],
   ['reconhecimento', 'Reconhecimento', 'motivação por ser reconhecido'],
   ['autonomia', 'Autonomia', 'motivação por decidir como trabalhar'],
   ['dinheiro', 'Dinheiro', 'motivação por ganhos financeiros'],
   ['seguranca', 'Segurança', 'motivação por segurança no emprego'],
   ['contribuicao', 'Contribuição social', 'motivação por contribuir com os outros'],
   ['aprendizado', 'Aprendizado', 'motivação por aprender continuamente'],
   ['lideranca', 'Liderança', 'motivação por orientar o rumo do grupo'],
   ['relacionamento', 'Pertencimento', 'motivação por vínculos fortes com o grupo'],
  ].forEach(([k, n, h]) => D('mot', 'm_' + k, n, h));

  // Preferências de atividade
  [['pessoas', 'Pessoas', 'preferência por lidar diretamente com pessoas'],
   ['numeros', 'Números', 'preferência por lidar com números e cálculo'],
   ['tecnologia', 'Tecnologia', 'interesse por tecnologia e sistemas'],
   ['natureza', 'Natureza', 'interesse por natureza, campo e seres vivos'],
   ['maquinas', 'Máquinas', 'interesse por máquinas e equipamentos'],
   ['linguagem', 'Linguagem', 'afinidade com palavras, textos e comunicação'],
   ['criatividade', 'Criatividade', 'afinidade com criar coisas novas'],
   ['negocios', 'Negócios', 'interesse por negócios e negociação'],
   ['investigacao', 'Investigação', 'interesse por investigar e pesquisar'],
   ['organizacao', 'Organização', 'afinidade com organizar processos e informações'],
  ].forEach(([k, n, h]) => D('pref', 'p_' + k, n, h));

  // Estilo / ambiente de trabalho
  [['individual', 'Trabalho individual', 'conforto em trabalhar sozinho por longos períodos'],
   ['equipe', 'Trabalho em equipe', 'preferência por decidir e executar em grupo'],
   ['lideranca', 'Liderança', 'abertura para ser responsável por equipes'],
   ['autonomia', 'Autonomia', 'preferência por liberdade para decidir como trabalhar'],
   ['rotina', 'Rotina', 'conforto com rotina previsível'],
   ['variedade', 'Variedade', 'preferência por variedade e imprevisto'],
   ['pressao', 'Pressão', 'tolerância a decisões rápidas e pressão'],
   ['competicao', 'Competição', 'conforto com competição e comparação de desempenho'],
   ['estabilidade', 'Estabilidade', 'preferência por organizações estáveis'],
   ['empreend', 'Empreendedorismo', 'abertura para empreender com renda incerta'],
   ['publico', 'Contato com público', 'conforto em atender muitas pessoas'],
   ['remoto', 'Trabalho remoto', 'abertura para trabalhar de casa'],
   ['operacional', 'Trabalho operacional', 'conforto com tarefas físicas/operacionais'],
   ['intelectual', 'Trabalho intelectual', 'prazer em raciocínio longo e complexo'],
   ['pratico', 'Trabalho prático', 'gosto de ver resultado concreto rápido'],
   ['corporativo', 'Ambiente corporativo', 'conforto com ambiente de escritório/empresa'],
   ['academico', 'Ambiente acadêmico', 'afinidade com ensino e pesquisa'],
   ['hospitalar', 'Ambiente hospitalar', 'conforto com ambiente de saúde e sofrimento humano'],
   ['externo', 'Ambiente externo', 'conforto em trabalhar ao ar livre e em campo'],
  ].forEach(([k, n, h]) => D('ws', 'w_' + k, n, h));

  // Autoeficácia por tipo de atividade
  D('eff', 'e_R', 'Confiança em atividades práticas', 'confiança em atividades práticas e técnicas');
  D('eff', 'e_I', 'Confiança em análise e estudo', 'confiança em análise, lógica e estudo autônomo');
  D('eff', 'e_A', 'Confiança em criar', 'confiança em criar e se expressar');
  D('eff', 'e_S', 'Confiança com pessoas', 'confiança em lidar e ensinar pessoas');
  D('eff', 'e_E', 'Confiança em liderar e persuadir', 'confiança em liderar e persuadir');
  D('eff', 'e_C', 'Confiança em organizar', 'confiança em organizar e ser preciso');

  // Preferências acadêmicas
  [['mat', 'Matemática'], ['fis', 'Física'], ['qui', 'Química'], ['bio', 'Biologia'],
   ['hum', 'Humanidades'], ['ling', 'Linguagens e redação']]
    .forEach(([k, n]) => D('acad', 'a_' + k, n, 'afinidade com ' + n.toLowerCase()));

  // Adaptabilidade (Career Adapt-Abilities como referência) e contexto
  D('adapt', 'c_preocupacao', 'Preocupação com o futuro', 'planejamento do futuro profissional');
  D('adapt', 'c_controle', 'Senso de controle', 'sensação de ter controle sobre a própria carreira');
  D('adapt', 'c_curiosidade', 'Curiosidade profissional', 'busca ativa de informação sobre carreiras');
  D('adapt', 'c_confianca', 'Confiança de carreira', 'confiança para superar obstáculos');
  D('ctx', 'x_longo', 'Aceita curso longo', 'aceitação de formação longa');
  D('ctx', 'x_renda', 'Urgência de renda', 'necessidade de renda rápida');
  D('ctx', 'x_mobil', 'Mobilidade geográfica', 'disposição para mudar de cidade');
  D('ctx', 'x_pesquisa', 'Conhecimento prévio dos cursos', 'já conhece bem os cursos que considera');

  const modulos = {
    1: { nome: 'Situações e atividades', desc: 'Imagine cada situação e diga como você reagiria.' },
    2: { nome: 'Como você costuma agir', desc: 'Não há resposta certa: escolha o que se parece mais com você.' },
    3: { nome: 'O que pesa nas suas escolhas', desc: 'Às vezes você vai precisar abrir mão de algo bom.' },
    4: { nome: 'O que te move', desc: 'Pense no que faria você continuar em um trabalho por anos.' },
    5: { nome: 'Dia a dia de trabalho', desc: 'Como você se sentiria em cada rotina?' },
    6: { nome: 'Confiança no que você faz', desc: 'Pense em como você se sairia, com algum treino.' },
    7: { nome: 'Estudos e temas', desc: 'Qual tipo de assunto prende mais a sua atenção?' },
    8: { nome: 'Seu momento atual', desc: 'Últimas perguntas, sobre o seu momento e planos.' },
  };

  V.groups = groups; V.dims = dims; V.modulos = modulos;
})();
