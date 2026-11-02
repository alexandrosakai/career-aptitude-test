/* Banco inicial de itens ORIGINAIS (v0.1 — modelo conceitual, sem validação empírica).
   t: L = escala de 5 pontos | F = escolha forçada | M = múltipla escolha de cenário
   d: cargas por dimensão (podem ser negativas) | rev: item reverso | w: peso | k: grupo de consistência
   bias: possível viés | qc: tipo de controle de qualidade (IF, SD, AC) */
(function () {
  const V = (globalThis.VOC = globalThis.VOC || {});

  const scales = {
    rx: ['Me desanimaria bastante', 'Me desanimaria um pouco', 'Indiferente', 'Me interessaria', 'Me empolgaria muito'],
    cc: ['Discordo totalmente', 'Discordo', 'Nem concordo nem discordo', 'Concordo', 'Concordo totalmente'],
    ef: ['Teria muita dificuldade', 'Teria alguma dificuldade', 'Conseguiria com esforço', 'Me sairia bem', 'Faria com facilidade'],
    im: ['Sem importância', 'Pouco importante', 'Depende', 'Importante', 'Essencial'],
    fr: ['Nunca', 'Raramente', 'Às vezes', 'Com frequência', 'Sempre'],
  };

  const items = [];
  const BIAS = { rx: 'Desejabilidade (itens positivos), aquiescência', cc: 'Aquiescência, desejabilidade social',
    ef: 'Autoavaliação inflada ou subestimada', im: 'Desejabilidade (tudo parece importante)', fr: 'Memória/autoimagem' };

  function L(m, id, q, sc, d, o) {
    o = o || {};
    items.push({ id, m, t: 'L', q, sc, d, rev: o.rev ? 1 : 0, w: o.w == null ? 1 : o.w, k: o.k || null,
      bias: o.bias || BIAS[sc], qc: o.qc || null });
  }
  function F(m, id, q, a, b, o) { // a, b = [texto, {dim:carga}]
    o = o || {};
    items.push({ id, m, t: 'F', q, opts: [{ x: a[0], d: a[1] }, { x: b[0], d: b[1] }], rev: 0, w: o.w == null ? 0.8 : o.w,
      k: o.k || null, bias: 'Ipsatividade (escolha relativa); ordem das opções' });
  }
  function M(m, id, q, opts, o) { // opts = [[texto,{dim}],...]
    o = o || {};
    items.push({ id, m, t: 'M', q, opts: opts.map(x => ({ x: x[0], d: x[1] })), rev: 0, w: o.w == null ? 0.9 : o.w,
      k: o.k || null, bias: 'Ipsatividade parcial; ordem das opções' });
  }

  /* ============ MÓDULO 1 — INTERESSES (36) ============ */
  // R
  L(1, 'I01', 'O aparelho de um vizinho parou de funcionar. Ele deixa você abrir, investigar e consertar com ferramentas à vontade. A tarde é sua.', 'rx', { R: 1, p_maquinas: 0.6, p_tecnologia: 0.3 });
  L(1, 'I02', 'Você passa um fim de semana ajudando a erguer uma estrutura (galpão, deck ou muro) num terreno aberto, sujando as mãos.', 'rx', { R: 1, p_natureza: 0.3 });
  L(1, 'I03', 'Te ensinam a operar e regular uma máquina complexa de oficina, com ajuste fino e resultado medido em milímetros.', 'rx', { R: 1, p_maquinas: 0.8 });
  L(1, 'I04', 'Você passa a manhã ao ar livre acompanhando o plantio e o manejo de uma área produtiva (horta, lavoura ou reflorestamento).', 'rx', { R: 0.7, p_natureza: 1 });
  // I
  L(1, 'I05', 'Você recebe dados confusos de uma pesquisa e precisa descobrir que padrão explica o que aconteceu. Ninguém tem pressa.', 'rx', { I: 1, p_numeros: 0.6, p_investigacao: 0.8 });
  L(1, 'I06', 'Imagine dedicar uma semana a estudar a fundo o funcionamento do corpo humano, interpretar exames e levantar possíveis causas para um problema.', 'rx', { I: 0.8, p_investigacao: 0.6, p_pessoas: 0.2, a_bio: 0.4 });
  L(1, 'I07', 'Você descobre que um sistema (app, site ou robô) pode ser programado para decidir sozinho, e tem um mês para construir o seu.', 'rx', { I: 0.8, R: 0.2, p_tecnologia: 1 });
  L(1, 'I08', 'Sua equipe precisa testar uma hipótese: montar um experimento, medir, repetir e só concluir quando os números sustentarem.', 'rx', { I: 1, p_investigacao: 1, p_numeros: 0.4 });
  // A
  L(1, 'I09', 'Você ganha uma tela em branco (pode ser texto, imagem, melodia ou espaço) e nenhuma regra sobre o que fazer com ela.', 'rx', { A: 1, p_criatividade: 1 });
  L(1, 'I10', 'Pedem que você dê identidade a um projeto novo: nome, estilo visual, tom de voz e a sensação que ele deve causar.', 'rx', { A: 1, p_criatividade: 0.7, p_linguagem: 0.4, p_negocios: 0.2 });
  L(1, 'I11', 'Você passa um dia inteiro refinando um detalhe estético (a luz de uma cena, o ritmo de um parágrafo, a curva de um objeto) até ficar certo.', 'rx', { A: 1, p_criatividade: 0.6 });
  L(1, 'I12', 'Convidam você a contar uma história real em vídeo, texto ou espetáculo, escolhendo como ela será contada.', 'rx', { A: 0.9, p_linguagem: 0.7, p_criatividade: 0.5 });
  // S
  L(1, 'I13', 'Alguém próximo está passando por um momento difícil e te procura só para conversar. Você tem a tarde livre.', 'rx', { S: 1, p_pessoas: 1 });
  L(1, 'I14', 'Você ensina alguém a dominar algo que ele achava impossível, acompanhando a evolução semana após semana.', 'rx', { S: 1, p_pessoas: 0.8, p_linguagem: 0.3 });
  L(1, 'I15', 'Você vira voluntário num mutirão que organiza orientação, cuidados básicos e acolhimento para uma comunidade.', 'rx', { S: 1, p_pessoas: 0.7 });
  L(1, 'I16', 'Um grupo com conflitos internos pede que você faça a mediação e ajude cada pessoa a ser ouvida.', 'rx', { S: 0.9, p_pessoas: 0.6, E: 0.2 });
  // E
  L(1, 'I17', 'Você tem a ideia de um produto ou serviço e uma verba pequena. Precisa convencer as primeiras pessoas a apostar nele.', 'rx', { E: 1, p_negocios: 1 });
  L(1, 'I18', 'Você assume a coordenação de uma equipe com prazo apertado, decidindo prioridades e cobrando entregas.', 'rx', { E: 0.9, p_pessoas: 0.3, p_organizacao: 0.3 });
  L(1, 'I19', 'Numa negociação, você precisa fechar um acordo vantajoso com alguém cujos interesses são opostos aos seus.', 'rx', { E: 1, p_negocios: 0.6, p_linguagem: 0.3 });
  L(1, 'I20', 'Surge a chance de um risco calculado: investir tempo e dinheiro numa oportunidade que pode render muito, ou nada.', 'rx', { E: 0.8, p_negocios: 0.7 });
  // C
  L(1, 'I21', 'Você herda um arquivo bagunçado (planilhas, documentos, registros) e tem tempo para deixá-lo completo, padronizado e fácil de consultar.', 'rx', { C: 1, p_organizacao: 1 });
  L(1, 'I22', 'Sua tarefa é conferir se cada número e cada documento de um processo bate com as regras, apontando qualquer divergência.', 'rx', { C: 1, p_organizacao: 0.6, p_numeros: 0.6 });
  L(1, 'I23', 'Você planeja, passo a passo, a logística de um grande evento: horários, fornecedores, orçamento e planos B.', 'rx', { C: 0.8, p_organizacao: 0.8, E: 0.2 });
  L(1, 'I24', 'Você recebe um procedimento detalhado, com etapas bem definidas, e deve executá-lo com precisão todos os dias.', 'rx', { C: 1, p_organizacao: 0.4 });
  // Escolha forçada (12)
  F(1, 'I25', 'Se pudesse escolher só uma atividade para o dia:', ['Consertar e ajustar um equipamento até funcionar perfeitamente', { R: 1, p_maquinas: 0.6 }], ['Acompanhar uma pessoa que precisa de orientação para resolver um problema pessoal', { S: 1, p_pessoas: 0.8 }]);
  F(1, 'I26', 'Uma empresa teve uma queda inexplicável de resultados. Você prefere:', ['Investigar a fundo a causa, cruzando dados e hipóteses', { I: 1, p_investigacao: 0.8 }], ['Apresentar a um grupo um plano para reverter a queda e convencê-los a executar', { E: 1, p_negocios: 0.5 }]);
  F(1, 'I27', 'Num projeto de comunicação, você prefere:', ['Criar do zero o visual e a ideia de um material', { A: 1, p_criatividade: 0.8 }], ['Revisar e padronizar cem materiais já prontos para ficarem consistentes', { C: 1, p_organizacao: 0.8 }]);
  F(1, 'I28', 'Numa turma com dificuldades, você prefere:', ['Explicar a matéria para colegas até todos entenderem', { S: 1, p_pessoas: 0.8 }], ['Estudar sozinho um tema difícil até dominá-lo por completo', { I: 1, p_investigacao: 0.5 }]);
  F(1, 'I29', 'Entre duas oportunidades de trabalho, você prefere:', ['Negociar contratos e fechar parcerias', { E: 1, p_negocios: 0.9 }], ['Montar e instalar equipamentos em campo', { R: 1, p_maquinas: 0.6 }]);
  F(1, 'I30', 'Se você tivesse que escolher uma tarefa para uma tarde:', ['Montar um orçamento sem nenhum erro', { C: 1, p_numeros: 0.6, p_organizacao: 0.6 }], ['Escrever um texto autoral sobre algo que importa para você', { A: 1, p_linguagem: 0.9 }]);
  F(1, 'I31', 'Diante de um fenômeno intrigante, você prefere:', ['Formular a explicação mais precisa possível', { I: 1, p_investigacao: 0.7 }], ['Encontrar a forma mais bonita e clara de representá-lo', { A: 1, p_criatividade: 0.7 }]);
  F(1, 'I32', 'Para ter impacto, você prefere:', ['Cuidar de poucas pessoas com muita atenção e proximidade', { S: 1, p_pessoas: 0.7 }], ['Liderar um projeto que atinge muita gente, de forma mais distante', { E: 1, p_negocios: 0.4 }]);
  F(1, 'I33', 'Seu dia ideal de trabalho se passa:', ['Em movimento: obra, campo ou oficina', { R: 1, p_natureza: 0.3 }], ['Sentado, com sistemas, registros e prazos organizados', { C: 1, p_organizacao: 0.6, p_tecnologia: 0.3 }]);
  F(1, 'I34', 'Com uma tarde livre, você prefere:', ['Produzir algo que expresse uma ideia sua', { A: 1, p_criatividade: 0.8 }], ['Usar o tempo para ajudar alguém a resolver um problema concreto', { S: 1, p_pessoas: 0.7 }]);
  F(1, 'I35', 'Numa decisão importante, você prefere:', ['Decidir rápido com informação incompleta e assumir o risco', { E: 1, p_negocios: 0.4 }], ['Só decidir depois de revisar todos os dados disponíveis', { C: 1, p_organizacao: 0.5, p_investigacao: 0.3 }]);
  F(1, 'I36', 'Diante de uma máquina complexa, você prefere:', ['Entender a teoria e os princípios por trás do funcionamento', { I: 1, p_investigacao: 0.5 }], ['Colocar a mão na máquina, operar e consertar', { R: 1, p_maquinas: 0.8 }]);

  /* ============ MÓDULO 2 — PERSONALIDADE (30) ============ */
  // Abertura
  L(2, 'P01', 'Quando conheço um jeito novo de fazer algo, gosto de testá-lo mesmo que o antigo funcione bem.', 'cc', { b_O: 1 }, { k: 'o1' });
  L(2, 'P02', 'Prefiro seguir o que já foi comprovado a arriscar caminhos incertos.', 'cc', { b_O: 1 }, { rev: 1, k: 'o1' });
  L(2, 'P03', 'Costumo me perder em pensamentos sobre ideias abstratas e possibilidades.', 'cc', { b_O: 1 });
  L(2, 'P04', 'Discussões sobre o sentido das coisas me parecem perda de tempo.', 'cc', { b_O: 1 }, { rev: 1 });
  L(2, 'P05', 'Conhecer lugares e culturas muito diferentes da minha me renova.', 'cc', { b_O: 1 }, { k: 'o2' });
  L(2, 'P06', 'Prefiro ambientes e hábitos que eu já conheço bem a mudanças de cenário.', 'cc', { b_O: 1 }, { rev: 1, k: 'o2' });
  // Conscienciosidade
  L(2, 'P07', 'Quando assumo um compromisso, costumo entregá-lo antes do prazo.', 'cc', { b_C: 1 }, { k: 'c1' });
  L(2, 'P08', 'Costumo deixar para depois o que é chato, mesmo sabendo do prazo.', 'cc', { b_C: 1 }, { rev: 1, k: 'c1' });
  L(2, 'P09', 'Minhas coisas e arquivos ficam organizados de um jeito que acho rápido o que preciso.', 'cc', { b_C: 1 });
  L(2, 'P10', 'Costumo agir no impulso e ver depois o que dá.', 'cc', { b_C: 1 }, { rev: 1 });
  L(2, 'P11', 'Confiro meu trabalho antes de considerá-lo pronto.', 'cc', { b_C: 1 });
  L(2, 'P12', 'Detalhes pequenos raramente me preocupam.', 'cc', { b_C: 1 }, { rev: 1 });
  // Extroversão
  L(2, 'P13', 'Em eventos com desconhecidos, costumo ser quem puxa conversa.', 'cc', { b_E: 1 });
  L(2, 'P14', 'Depois de um dia cheio de gente, preciso de silêncio para recuperar a energia.', 'cc', { b_E: 1 }, { rev: 1 });
  L(2, 'P15', 'Em reuniões e grupos, costumo ser quem mais fala.', 'cc', { b_E: 1 }, { k: 'e1' });
  L(2, 'P16', 'Em grupos, prefiro ouvir a falar.', 'cc', { b_E: 1 }, { rev: 1, k: 'e1' });
  L(2, 'P17', 'Ambientes animados e movimentados me dão energia.', 'cc', { b_E: 1 });
  L(2, 'P18', 'Em grupos grandes, costumo passar despercebido.', 'cc', { b_E: 1 }, { rev: 1 });
  // Amabilidade
  L(2, 'P19', 'Costumo ceder para evitar um conflito desnecessário.', 'cc', { b_A: 1 });
  L(2, 'P20', 'Quando acho que estou certo, defendo meu ponto mesmo que cause atrito.', 'cc', { b_A: 1 }, { rev: 1 });
  L(2, 'P21', 'Me incomoda ver alguém ser tratado de forma injusta, mesmo que eu não o conheça.', 'cc', { b_A: 1 });
  L(2, 'P22', 'Em geral, desconfio das intenções das pessoas até que provem o contrário.', 'cc', { b_A: 1 }, { rev: 1 });
  L(2, 'P23', 'Me ofereço para ajudar colegas mesmo quando isso atrasa as minhas tarefas.', 'cc', { b_A: 1 });
  L(2, 'P24', 'Competir com os outros me motiva mais do que cooperar.', 'cc', { b_A: 1 }, { rev: 1 });
  // Estabilidade emocional
  L(2, 'P25', 'Mesmo sob pressão, consigo manter a calma e pensar com clareza.', 'cc', { b_ES: 1 });
  L(2, 'P26', 'Pequenas críticas ficam na minha cabeça por dias.', 'cc', { b_ES: 1 }, { rev: 1 });
  L(2, 'P27', 'Costumo me recuperar rápido de decepções.', 'cc', { b_ES: 1 });
  L(2, 'P28', 'Antes de eventos importantes, fico muito ansioso.', 'cc', { b_ES: 1 }, { rev: 1 });
  L(2, 'P29', 'Imprevistos de última hora raramente me tiram do eixo.', 'cc', { b_ES: 1 });
  L(2, 'P30', 'Meu humor muda bastante de um dia para o outro.', 'cc', { b_ES: 1 }, { rev: 1 });

  /* ============ MÓDULO 3 — VALORES (24) ============ */
  L(3, 'V01', 'Quanto seria importante que o seu trabalho garantisse o mesmo salário e função por muitos anos?', 'im', { v_estabilidade: 1 }, { k: 'estab' });
  L(3, 'V02', 'Quanto seria importante que o seu trabalho não envolvesse risco físico ou financeiro relevante?', 'im', { v_seguranca: 1 });
  L(3, 'V03', 'Quanto seria importante que as pessoas à sua volta admirassem a sua profissão?', 'im', { v_prestigio: 1 }, { k: 'prest' });
  L(3, 'V04', 'O que os outros pensam da minha profissão pesa pouco na minha escolha.', 'cc', { v_prestigio: 1 }, { rev: 1, k: 'prest' });
  L(3, 'V05', 'Quanto seria importante inventar soluções novas com frequência no seu trabalho?', 'im', { v_criatividade: 1 });
  L(3, 'V06', 'Quanto seria importante ser quem decide pelo trabalho de outras pessoas?', 'im', { v_lideranca: 1 });
  L(3, 'V07', 'Quanto seria importante ser obrigado a continuar estudando coisas difíceis durante a carreira?', 'im', { v_conhecimento: 1 });
  L(3, 'V08', 'Quanto seria importante decidir sozinho como e quando fazer o seu trabalho?', 'im', { v_autonomia: 1 }, { k: 'auto' });
  L(3, 'V09', 'Quanto seria importante ter chance real de ganhos muito acima da média, mesmo com mais esforço?', 'im', { v_remuneracao: 1 });
  L(3, 'V10', 'Quanto seria importante contribuir de forma visível para melhorar a vida de outras pessoas?', 'im', { v_impacto: 1 });
  L(3, 'V11', 'Quanto seria importante que o trabalho respeitasse seus horários, fins de semana e vida pessoal?', 'im', { v_equilibrio: 1 });
  L(3, 'V12', 'Trabalhar por causas coletivas é, para mim, menos importante do que construir minha própria estabilidade.', 'cc', { v_impacto: 1, v_estabilidade: -0.4 }, { rev: 1 });
  F(3, 'V13', 'Entre duas ofertas de trabalho, você escolheria:', ['Salário muito alto, com plantões e noites frequentes', { v_remuneracao: 1 }], ['Salário bom, com horários previsíveis e fins de semana livres', { v_equilibrio: 1 }], { w: 0.9 });
  F(3, 'V14', 'Entre duas ofertas de trabalho, você escolheria:', ['Emprego permanente numa organização sólida, com tarefas definidas', { v_estabilidade: 1 }], ['Renda variável, porém decidindo tudo por conta própria', { v_autonomia: 1 }], { w: 0.9 });
  F(3, 'V15', 'Entre duas profissões, você escolheria:', ['Muito reconhecida socialmente, com impacto indireto', { v_prestigio: 1 }], ['Discreta, mas com impacto direto na vida de pessoas', { v_impacto: 1 }], { w: 0.9 });
  F(3, 'V16', 'No trabalho, você prefere:', ['Criar coisas novas sem garantia de aprovação', { v_criatividade: 1 }], ['Executar bem um processo comprovado, com baixo risco', { v_seguranca: 1 }], { w: 0.9 });
  F(3, 'V17', 'Daqui a dez anos, você prefere ser:', ['Quem coordena uma equipe grande e responde pelos resultados', { v_lideranca: 1 }], ['A pessoa mais especializada num assunto difícil, sem liderar ninguém', { v_conhecimento: 1 }], { w: 0.9 });
  F(3, 'V18', 'Entre duas oportunidades, você escolheria:', ['Ganhar bem acima da média numa área sem muito impacto social', { v_remuneracao: 1 }], ['Ganhar na média numa área que transforma a vida de muitas pessoas', { v_impacto: 1 }], { w: 0.9 });
  F(3, 'V19', 'Entre dois cenários de trabalho, você escolheria:', ['Total liberdade, mas sem nenhuma garantia de continuidade', { v_autonomia: 1 }], ['Menos liberdade, com garantia de continuidade e baixo risco', { v_seguranca: 1 }], { w: 0.9 });
  F(3, 'V20', 'Entre duas propostas, você escolheria:', ['Cargo de grande prestígio, com jornada muito longa', { v_prestigio: 1 }], ['Cargo comum, com muito tempo livre para a vida pessoal', { v_equilibrio: 1 }], { w: 0.9 });
  F(3, 'V21', 'Entre duas rotinas, você escolheria:', ['Estudar e aprofundar-se em um assunto, mesmo com a estabilidade incerta', { v_conhecimento: 1 }], ['Uma função estável, mesmo sem muito espaço para aprofundar', { v_estabilidade: 1 }], { w: 0.9 });
  F(3, 'V22', 'Entre duas carreiras, você escolheria:', ['Criar algo autoral, mesmo com ganhos incertos', { v_criatividade: 1 }], ['Ganhos altos, mesmo que você execute o que os outros criaram', { v_remuneracao: 1 }], { w: 0.9 });
  F(3, 'V23', 'Entre dois papéis, você escolheria:', ['Líder com agenda cheia, sem hora para acabar', { v_lideranca: 1 }], ['Profissional com horário fixo e vida pessoal preservada', { v_equilibrio: 1 }], { w: 0.9 });
  F(3, 'V24', 'Entre duas missões, você escolheria:', ['Ajudar muita gente, seguindo regras e processos definidos pela organização', { v_impacto: 1 }], ['Trabalhar do seu jeito, em algo de impacto mais limitado', { v_autonomia: 1 }], { w: 0.9 });

  /* ============ MÓDULO 4 — MOTIVADORES (18) ============ */
  L(4, 'M01', 'Tarefas fáceis me entediam rápido; preciso sentir que estou no limite do que sei.', 'cc', { m_desafio: 1 }, { k: 'm1' });
  L(4, 'M02', 'Prefiro trabalhos em que sei que vou acertar a desafios que podem dar errado.', 'cc', { m_desafio: 1 }, { rev: 1, k: 'm1' });
  L(4, 'M03', 'Ouvir elogios públicos pelo meu trabalho me motiva muito.', 'cc', { m_reconhecimento: 1 }, { k: 'm2' });
  L(4, 'M04', 'Pouco me importa quem percebe o que fiz, desde que esteja bem feito.', 'cc', { m_reconhecimento: 1 }, { rev: 1, k: 'm2' });
  L(4, 'M05', 'Trabalho melhor quando ninguém me diz como fazer.', 'cc', { m_autonomia: 1 }, { k: 'm3' });
  L(4, 'M06', 'Gosto de receber instruções claras de como proceder.', 'cc', { m_autonomia: 1 }, { rev: 1, k: 'm3' });
  L(4, 'M07', 'Saber que meu esforço pode virar ganhos maiores me faz render mais.', 'cc', { m_dinheiro: 1 }, { k: 'm4' });
  L(4, 'M08', 'Escolheria um trabalho que me realiza mesmo que pague pouco.', 'cc', { m_dinheiro: 1 }, { rev: 1, k: 'm4' });
  L(4, 'M09', 'Fico mais motivado quando sei que meu emprego está garantido.', 'cc', { m_seguranca: 1 }, { k: 'm5' });
  L(4, 'M10', 'Mudanças bruscas de emprego ou de área me atraem.', 'cc', { m_seguranca: 1 }, { rev: 1, k: 'm5' });
  L(4, 'M11', 'Fico mais motivado quando vejo que o que faço melhora a vida de alguém.', 'cc', { m_contribuicao: 1 }, { k: 'm6' });
  L(4, 'M12', 'Para mim, trabalho é sobretudo um meio de sustento, não de ajudar o mundo.', 'cc', { m_contribuicao: 1 }, { rev: 1, k: 'm6' });
  L(4, 'M13', 'Um trabalho em que aprendo algo novo todo mês me prende por muito tempo.', 'cc', { m_aprendizado: 1 }, { k: 'm7' });
  L(4, 'M14', 'Depois que domino uma função, prefiro executá-la sem grandes mudanças.', 'cc', { m_aprendizado: 1 }, { rev: 1, k: 'm7' });
  L(4, 'M15', 'Gosto de ser a pessoa que define o rumo do grupo.', 'cc', { m_lideranca: 1 }, { k: 'm8' });
  L(4, 'M16', 'Prefiro seguir um bom líder a ter que ser o líder.', 'cc', { m_lideranca: 1 }, { rev: 1, k: 'm8' });
  L(4, 'M17', 'Um grupo unido, em que me sinto parte, pesa mais do que o cargo que ocupo.', 'cc', { m_relacionamento: 1 }, { k: 'm9' });
  L(4, 'M18', 'Consigo ser feliz num trabalho em que quase não tenho vínculo com colegas.', 'cc', { m_relacionamento: 1 }, { rev: 1, k: 'm9' });

  /* ============ MÓDULO 5 — ESTILO DE TRABALHO (20) ============ */
  L(5, 'W01', 'Passar o dia inteiro sozinho numa tarefa complexa, sem interrupções.', 'rx', { w_individual: 1 }, { k: 'ind' });
  L(5, 'W02', 'Um trabalho em que quase tudo é decidido e feito em grupo, com reuniões frequentes.', 'rx', { w_equipe: 1 });
  L(5, 'W03', 'Ser o responsável final pelos resultados de uma equipe de dez pessoas.', 'rx', { w_lideranca: 1 });
  L(5, 'W04', 'Ter metas, mas liberdade total para escolher como e quando cumpri-las.', 'rx', { w_autonomia: 1 }, { k: 'auto' });
  L(5, 'W05', 'Uma rotina muito parecida todos os dias, com horários e tarefas previsíveis.', 'rx', { w_rotina: 1 });
  L(5, 'W06', 'Cada semana trazer problemas diferentes, sem saber o que vem pela frente.', 'rx', { w_variedade: 1 });
  L(5, 'W07', 'Tomar em poucos minutos decisões de consequência séria, inclusive em plantões e fins de semana.', 'rx', { w_pressao: 1 });
  L(5, 'W08', 'Ter seu desempenho comparado abertamente ao dos colegas, com ranking e metas individuais.', 'rx', { w_competicao: 1 });
  L(5, 'W09', 'Uma organização grande e antiga, com plano de carreira e pouca chance de demissão.', 'rx', { w_estabilidade: 1, v_estabilidade: 0.3 }, { k: 'estab' });
  L(5, 'W10', 'Abrir o próprio negócio e viver os primeiros anos com renda incerta.', 'rx', { w_empreend: 1 });
  L(5, 'W11', 'Atender dezenas de pessoas por dia, ouvindo demandas e dúvidas diferentes.', 'rx', { w_publico: 1 });
  L(5, 'W12', 'Trabalhar de casa na maior parte da semana, com pouco contato presencial.', 'rx', { w_remoto: 1 });
  L(5, 'W13', 'Passar boa parte do dia em tarefas físicas ou operacionais.', 'rx', { w_operacional: 1 });
  L(5, 'W14', 'Passar o dia lendo, analisando e produzindo raciocínios complexos.', 'rx', { w_intelectual: 1 });
  L(5, 'W15', 'Ver o resultado concreto do seu trabalho no mesmo dia (algo construído, consertado ou entregue).', 'rx', { w_pratico: 1 });
  L(5, 'W16', 'Trabalhar num escritório de empresa, com horários, reuniões e cultura corporativa.', 'rx', { w_corporativo: 1 });
  L(5, 'W17', 'Trabalhar em ambiente de ensino ou pesquisa, entre salas, laboratórios e bibliotecas.', 'rx', { w_academico: 1 });
  L(5, 'W18', 'Passar o dia em hospital ou unidade de saúde, entre doença, urgência e sofrimento humano.', 'rx', { w_hospitalar: 1, w_pressao: 0.2 });
  L(5, 'W19', 'Trabalhar a maior parte do tempo ao ar livre ou em campo, com sol, chuva e deslocamentos.', 'rx', { w_externo: 1 });
  L(5, 'W20', 'Preciso de gente por perto para me manter produtivo durante o dia de trabalho.', 'cc', { w_individual: 1, w_equipe: -0.6 }, { rev: 1, k: 'ind' });

  /* ============ MÓDULO 6 — AUTOEFICÁCIA (24) ============ */
  const EF = 'Com um treino razoável, como você se sairia em: ';
  [['E01', 'Montar ou consertar um objeto com peças e instruções confusas', 'e_R'],
   ['E02', 'Usar ferramentas ou equipamentos para construir algo que funcione e dure', 'e_R'],
   ['E03', 'Trabalhar fisicamente por várias horas, em campo ou oficina, mantendo a qualidade', 'e_R'],
   ['E04', 'Operar uma máquina nova depois de poucas explicações', 'e_R'],
   ['E05', 'Entender um texto técnico denso e explicá-lo com suas palavras', 'e_I'],
   ['E06', 'Resolver um problema de lógica ou matemática que exige várias etapas', 'e_I'],
   ['E07', 'Planejar um teste para saber se uma ideia funciona de fato', 'e_I'],
   ['E08', 'Estudar um assunto difícil sozinho, por semanas, sem ninguém cobrando', 'e_I'],
   ['E09', 'Criar algo original (texto, imagem, música ou projeto) a partir de uma ideia vaga', 'e_A'],
   ['E10', 'Perceber detalhes de estética que a maioria das pessoas não vê', 'e_A'],
   ['E11', 'Apresentar uma ideia de forma envolvente, que prenda a atenção do público', 'e_A'],
   ['E12', 'Refazer algo seu depois de uma crítica dura, melhorando de verdade', 'e_A'],
   ['E13', 'Perceber o que uma pessoa realmente sente, mesmo quando ela não diz', 'e_S'],
   ['E14', 'Explicar algo difícil de modo que alguém sem base entenda', 'e_S'],
   ['E15', 'Manter a calma e acolher uma pessoa muito nervosa ou aflita', 'e_S'],
   ['E16', 'Mediar uma discussão entre duas pessoas que não se entendem', 'e_S'],
   ['E17', 'Convencer pessoas céticas a apoiar uma proposta sua', 'e_E'],
   ['E18', 'Tomar uma decisão difícil e assumir a responsabilidade se der errado', 'e_E'],
   ['E19', 'Coordenar o trabalho de várias pessoas com opiniões diferentes', 'e_E'],
   ['E20', 'Se apresentar e criar contatos úteis com desconhecidos', 'e_E'],
   ['E21', 'Manter registros e documentos completos e sem erros por muito tempo', 'e_C'],
   ['E22', 'Seguir um procedimento com muitos passos sem pular nenhum', 'e_C'],
   ['E23', 'Organizar um cronograma com muitas tarefas e prazos ao mesmo tempo', 'e_C'],
   ['E24', 'Notar uma inconsistência pequena numa tabela ou relatório', 'e_C'],
  ].forEach(([id, q, d]) => L(6, id, EF + q.charAt(0).toLowerCase() + q.slice(1) + '?', 'ef', { [d]: 1 }));

  /* ============ MÓDULO 7 — PREFERÊNCIAS ACADÊMICAS (12) ============ */
  L(7, 'A01', 'Um problema de matemática que leva uma hora para resolver, mas tem resposta exata.', 'rx', { a_mat: 1 });
  L(7, 'A02', 'Aprender como uma fórmula é deduzida, em vez de só aplicá-la.', 'rx', { a_mat: 1, a_fis: 0.3 });
  L(7, 'A03', 'Entender, com cálculos, por que um objeto cai, gira ou se move do jeito que se move.', 'rx', { a_fis: 1, a_mat: 0.3 });
  L(7, 'A04', 'Descobrir como misturar substâncias muda as propriedades delas (sabões, alimentos, medicamentos).', 'rx', { a_qui: 1 });
  L(7, 'A05', 'Passar uma aula em laboratório, medindo e anotando reações com precisão.', 'rx', { a_qui: 1 });
  L(7, 'A06', 'Estudar como células, órgãos e seres vivos se organizam e se adaptam.', 'rx', { a_bio: 1 });
  L(7, 'A07', 'Debater por que uma sociedade mudou ao longo da história e quais forças a moveram.', 'rx', { a_hum: 1 });
  L(7, 'A08', 'Ler sobre leis, instituições e ideias políticas e discutir seus limites.', 'rx', { a_hum: 1, a_ling: 0.2 });
  L(7, 'A09', 'Escrever um texto longo e argumentado, revisando-o várias vezes.', 'rx', { a_ling: 1 });
  M(7, 'A10', 'Num fim de semana livre de estudo, o que você escolheria?', [
    ['Resolver uma lista de problemas de cálculo desafiadores', { a_mat: 1 }],
    ['Entender como a energia elétrica chega à tomada e o que a controla', { a_fis: 1 }],
    ['Ler e comentar um livro de ensaios sobre a sociedade', { a_hum: 1 }],
    ['Escrever uma crônica ou resenha caprichada', { a_ling: 1 }]]);
  M(7, 'A11', 'Num fim de semana livre de estudo, o que você escolheria?', [
    ['Fazer um experimento caseiro com substâncias e observar as reações', { a_qui: 1 }],
    ['Estudar como animais e plantas de um ecossistema se relacionam', { a_bio: 1 }],
    ['Estudar probabilidade e estatística com exemplos reais', { a_mat: 1 }],
    ['Estudar a estrutura de outra língua e traduzir um texto', { a_ling: 1 }]]);
  M(7, 'A12', 'Num fim de semana livre de estudo, o que você escolheria?', [
    ['Estudar como o corpo humano reage a doenças e a remédios', { a_bio: 1, a_qui: 0.4 }],
    ['Investigar uma questão histórica a partir de documentos', { a_hum: 1 }],
    ['Estudar como a luz, o som e o movimento são descritos por equações', { a_fis: 1 }],
    ['Estudar a composição e a transformação dos materiais do dia a dia', { a_qui: 1 }]]);

  /* ============ MÓDULO 8 — CONTEXTO DE CARREIRA (12) ============ */
  L(8, 'X01', 'Penso com frequência no tipo de vida e de trabalho que terei daqui a dez anos.', 'cc', { c_preocupacao: 1 }, { k: 'x1' });
  L(8, 'X02', 'Não me preocupo com o futuro profissional; resolvo quando a hora chegar.', 'cc', { c_preocupacao: 1 }, { rev: 1, k: 'x1' });
  L(8, 'X03', 'As escolhas que faço hoje definem em grande parte o meu caminho profissional.', 'cc', { c_controle: 1 }, { k: 'x2' });
  L(8, 'X04', 'Minha carreira vai depender mais de sorte e circunstâncias do que das minhas decisões.', 'cc', { c_controle: 1 }, { rev: 1, k: 'x2' });
  L(8, 'X05', 'Conversei ou pesquisei sobre a rotina real de profissionais de áreas que me atraem.', 'fr', { c_curiosidade: 1 });
  L(8, 'X06', 'Busco conhecer opções de carreira que ainda não conheço.', 'cc', { c_curiosidade: 1 });
  L(8, 'X07', 'Acredito que consigo superar os obstáculos que aparecerem no meu caminho profissional.', 'cc', { c_confianca: 1 }, { k: 'x3' });
  L(8, 'X08', 'Tenho dúvidas se serei capaz de concluir um curso superior exigente.', 'cc', { c_confianca: 1 }, { rev: 1, k: 'x3' });
  L(8, 'X09', 'Estudar por 5 a 6 anos antes de exercer plenamente a profissão é aceitável para mim.', 'cc', { x_longo: 1 });
  L(8, 'X10', 'Preciso começar a ganhar dinheiro o quanto antes, em até dois anos.', 'cc', { x_renda: 1 });
  L(8, 'X11', 'Posso me mudar de cidade ou de estado para estudar ou trabalhar.', 'cc', { x_mobil: 1 });
  L(8, 'X12', 'Sei dizer com clareza quais disciplinas vou encontrar nos cursos que me atraem.', 'cc', { x_pesquisa: 1 });

  /* ============ CONTROLE DE QUALIDADE (8) — sem carga em dimensões ============ */
  L(9, 'Q01', 'Em toda a minha vida, nunca senti sono nem cansaço.', 'cc', {}, { w: 0, qc: 'IF', bias: 'Item de baixa frequência: concordar sugere desatenção ou exagero' });
  L(9, 'Q02', 'Nos últimos 12 meses li mais de mil livros inteiros.', 'cc', {}, { w: 0, qc: 'IF', bias: 'Item de baixa frequência' });
  L(9, 'Q03', 'Tenho certeza de que nunca errei uma conta simples na vida.', 'cc', {}, { w: 0, qc: 'IF', bias: 'Item de baixa frequência' });
  L(9, 'Q04', 'Nunca fico irritado com ninguém.', 'cc', {}, { w: 0, qc: 'SD', bias: 'Desejabilidade social' });
  L(9, 'Q05', 'Jamais deixei para depois algo que deveria fazer hoje.', 'cc', {}, { w: 0, qc: 'SD', bias: 'Desejabilidade social' });
  L(9, 'Q06', 'Já contei uma pequena mentira para evitar um constrangimento.', 'cc', {}, { w: 0, qc: 'SD', rev: 1, bias: 'Desejabilidade social (discordar sugere imagem idealizada)' });
  L(9, 'Q07', 'Para mostrar que está lendo com atenção, marque "Concordo" nesta pergunta.', 'cc', {}, { w: 0, qc: 'AC', bias: 'Checagem de atenção (esperado: 4)' });
  L(9, 'Q08', 'Esta é uma checagem de atenção: marque "Discordo" nesta pergunta.', 'cc', {}, { w: 0, qc: 'AC', bias: 'Checagem de atenção (esperado: 2)' });

  /* ---------- Cargas cruzadas secundárias ----------
     Cada dimensão de estilo de trabalho (w_*) tem 1 item dedicado (M5). Para não depender de um único item, itens de outros módulos
     contribuem com carga baixa (≤ 0,5). É evidência convergente PLAUSÍVEL, ainda não testada: a análise fatorial do piloto pode
     eliminar ou ajustar qualquer uma destas cargas. Carga negativa em item reverso = concordar aumenta a dimensão. */
  const CRUZ = {
    I01: { w_pratico: 0.3 }, I02: { w_pratico: 0.3, w_externo: 0.4, w_operacional: 0.3 }, I03: { w_operacional: 0.4, w_pratico: 0.3 },
    I04: { w_externo: 0.5 }, I05: { w_intelectual: 0.4 }, I06: { w_hospitalar: 0.3, w_intelectual: 0.3 }, I07: { w_remoto: 0.2, w_intelectual: 0.2 },
    I08: { w_intelectual: 0.4, w_academico: 0.3 }, I09: { w_autonomia: 0.3, w_variedade: 0.3 }, I10: { w_variedade: 0.3 }, I11: { w_individual: 0.2 },
    I12: { w_publico: 0.2 }, I13: { w_publico: 0.3 }, I14: { w_academico: 0.3, w_publico: 0.2 }, I15: { w_publico: 0.3, w_equipe: 0.3 },
    I16: { w_equipe: 0.3, w_pressao: 0.2 }, I17: { w_empreend: 0.4 }, I18: { w_lideranca: 0.5, w_pressao: 0.3, w_equipe: 0.3 }, I19: { w_competicao: 0.4 },
    I20: { w_empreend: 0.4, w_pressao: 0.2 }, I21: { w_rotina: 0.4, w_individual: 0.2, w_corporativo: 0.2 }, I22: { w_rotina: 0.3, w_corporativo: 0.2 },
    I23: { w_variedade: 0.2, w_pressao: 0.2, w_corporativo: 0.2 }, I24: { w_rotina: 0.5 },
    P01: { w_variedade: 0.3 }, P02: { w_variedade: 0.3 }, P09: { w_rotina: 0.2 }, P13: { w_publico: 0.3 }, P15: { w_lideranca: 0.3 }, P17: { w_publico: 0.2 },
    P24: { w_competicao: -0.5 }, P25: { w_pressao: 0.4 }, P27: { w_pressao: 0.2 }, P29: { w_pressao: 0.3, w_variedade: 0.3 },
    M01: { w_pressao: 0.2 }, M05: { w_autonomia: 0.4 }, M06: { w_autonomia: 0.4 }, M07: { w_competicao: 0.2 }, M09: { w_estabilidade: 0.4 }, M10: { w_estabilidade: 0.4 },
    M11: { w_publico: 0.2 }, M13: { w_variedade: 0.3 }, M14: { w_rotina: -0.4, w_variedade: 0.3 }, M15: { w_lideranca: 0.4 }, M16: { w_lideranca: 0.4 },
    M17: { w_equipe: 0.4 }, M18: { w_equipe: 0.4 },
    V01: { w_estabilidade: 0.3 }, V05: { w_variedade: 0.2 }, V06: { w_lideranca: 0.3 }, V07: { w_academico: 0.3, w_intelectual: 0.3 }, V08: { w_autonomia: 0.3 }, V09: { w_competicao: 0.2 },
    E02: { w_pratico: 0.3, w_operacional: 0.3 }, E03: { w_operacional: 0.3, w_externo: 0.2 }, E04: { w_operacional: 0.2 }, E05: { w_intelectual: 0.3 }, E06: { w_intelectual: 0.3 },
    E08: { w_individual: 0.3, w_intelectual: 0.3, w_academico: 0.2 }, E15: { w_hospitalar: 0.3, w_publico: 0.2 }, E18: { w_pressao: 0.3, w_lideranca: 0.2 },
    E19: { w_lideranca: 0.4, w_equipe: 0.3 }, E20: { w_publico: 0.3, w_empreend: 0.2 }, E21: { w_rotina: 0.3 }, E22: { w_rotina: 0.3 }, E23: { w_corporativo: 0.2 },
  };
  items.forEach(i => { if (CRUZ[i.id]) Object.assign(i.d, CRUZ[i.id]); });
  V.cargasCruzadas = CRUZ;

  V.scales = scales;
  V.items = items;
  V.itemById = Object.fromEntries(items.map(i => [i.id, i]));
})();
