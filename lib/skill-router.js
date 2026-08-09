// Deterministic routing from structured intent signals to decision skills.
// An LLM may infer the signals from natural language, but it does not choose the final skills.

const RULES = [
  {
    skill: 'framing-decisions',
    when: (s) => Boolean(s.decisionChoice || s.portfolioDecision || s.resourceAllocation || s.needsMoreInformation),
    reason: 'the request requires framing alternatives and uncertainty before downstream analysis',
  },
  {
    skill: 'valuing-information',
    when: (s) => Boolean(s.needsMoreInformation),
    reason: 'the user must decide whether gathering more evidence is worth its cost and delay',
  },
  {
    skill: 'allocating-effort',
    when: (s) => Boolean(s.resourceAllocation || s.portfolioDecision),
    reason: 'a limited resource must be allocated across competing options',
  },
  {
    skill: 'planning-horizons',
    when: (s) => Boolean(s.planningHorizon || s.roadmapOrdering),
    reason: 'the request concerns planning depth, order or roadmap horizon',
  },
  {
    skill: 'stress-testing-plans',
    when: (s) => Boolean(s.stressTestPlan || s.premortem),
    reason: 'an existing or candidate plan needs robustness and failure-mode analysis',
  },
  {
    skill: 'tracking-beliefs',
    when: (s) => Boolean(s.metricSignal || s.beliefUpdate),
    reason: 'the request asks whether observed evidence should change a belief',
  },
  {
    skill: 'reading-rivals',
    when: (s) => Boolean(s.competitorAnalysis),
    reason: 'the request concerns interpreting a competitor or rival action',
  },
  {
    skill: 'learning-from-outcomes',
    when: (s) => Boolean(s.retrospective || s.outcomeReview),
    reason: 'a past decision has an observed outcome that should update future decisions',
  },
];

export function inferSignals(text = '') {
  const q = String(text).toLowerCase();
  const has = (...patterns) => patterns.some((p) => p.test(q));

  const signals = {
    decisionChoice: has(/стоит ли/, /выбрат/, /что лучше/, /куда влож/, /which .*choose/, /should i/, /better option/),
    resourceAllocation: has(/распредел/, /между .*проект/, /\bбюджет\b/, /\bчас(?:а|ов)?\b/, /allocate/, /resource allocation/),
    portfolioDecision: has(/портфел/, /несколько проект/, /между .*проект/, /portfolio/),
    needsMoreInformation: has(/ещ[её] .*исслед/, /собрать .*данн/, /сначала .*тест/, /исследовать .*или/, /more research/, /more data/, /test first/, /value of information/),
    planningHorizon: has(/горизонт/, /на сколько .*план/, /planning horizon/),
    roadmapOrdering: has(/roadmap/, /что сначала/, /в каком порядке/, /приоритет.*этап/, /what first/, /order .*roadmap/),
    stressTestPlan: has(/проверь .*план/, /слаб.*мест/, /сломаться/, /stress[- ]?test/, /weak point/),
    premortem: has(/преморт/, /pre[- ]?mortem/),
    metricSignal: has(/метрик/, /конверси/, /сигнал .*шум/, /выросл?[аи]? .*%/, /упал[аи]? .*%/, /metric/, /signal .*noise/),
    beliefUpdate: has(/обнов.*вероят/, /измени.*мнени/, /update .*belief/, /posterior/),
    competitorAnalysis: has(/конкурент/, /соперник/, /rival/, /competitor/),
    retrospective: has(/ретро/, /ошиблись/, /почему .*решение/, /postmortem/, /retrospective/),
    outcomeReview: has(/получили .*результат/, /фактическ.*результат/, /actual outcome/, /result .*expected/),
  };

  return signals;
}

export function routeSkills(signals = {}, registry = []) {
  const available = new Set(registry.map((skill) => skill.name));
  const routed = [];

  for (const rule of RULES) {
    if (!rule.when(signals)) continue;
    if (available.size && !available.has(rule.skill)) continue;
    routed.push({ skill: rule.skill, reason: rule.reason });
  }

  return routed;
}

export function routingRules() {
  return RULES.map(({ skill, reason }) => ({ skill, reason }));
}
