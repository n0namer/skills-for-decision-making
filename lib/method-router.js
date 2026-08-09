// Deterministic routing from a DecisionSpec to allowed analysis methods.
// The LLM may populate the spec, but it does not get to invent the numerical method.

export function selectDecisionMethods(spec) {
  const methods = [];

  const hasProbabilisticOutcomes = Array.isArray(spec.alternatives) &&
    spec.alternatives.some((alternative) =>
      Array.isArray(alternative.outcomes) && alternative.outcomes.length > 0);

  const hasObservations = Array.isArray(spec.observations) && spec.observations.length > 0;
  const hasMultipleCriteria = Array.isArray(spec.criteria) && spec.criteria.length >= 2;
  const hasScoredCriteria = hasMultipleCriteria && Array.isArray(spec.alternatives) &&
    spec.alternatives.every((alternative) => alternative.scores && typeof alternative.scores === 'object');
  const hasParameterRanges = Array.isArray(spec.parameters) &&
    spec.parameters.some((parameter) => Array.isArray(parameter.range) && parameter.range.length === 2);

  if (hasProbabilisticOutcomes) methods.push('expected-utility');
  if (hasObservations && hasProbabilisticOutcomes) methods.push('value-of-information');
  if (hasScoredCriteria) methods.push('mcda');
  if (hasParameterRanges) methods.push('sensitivity');

  // Pareto is useful when several criteria exist but no complete weights were supplied.
  const allWeighted = hasMultipleCriteria && spec.criteria.every((criterion) =>
    Number.isFinite(criterion.weight));
  if (hasScoredCriteria && !allWeighted) methods.push('pareto');

  if (methods.length === 0) methods.push('framing-only');
  return methods;
}

export function explainMethodSelection(spec) {
  const methods = selectDecisionMethods(spec);
  return methods.map((method) => {
    switch (method) {
      case 'expected-utility':
        return { method, reason: 'alternatives include probabilistic outcomes' };
      case 'value-of-information':
        return { method, reason: 'candidate observations can change a probabilistic decision' };
      case 'mcda':
        return { method, reason: 'alternatives are scored across multiple criteria' };
      case 'sensitivity':
        return { method, reason: 'one or more input parameters are uncertain ranges' };
      case 'pareto':
        return { method, reason: 'multiple criteria exist without a complete weight model' };
      default:
        return { method, reason: 'insufficient structured numeric inputs; continue decision framing' };
    }
  });
}
