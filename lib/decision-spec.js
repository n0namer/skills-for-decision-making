// Canonical input contract for the extended decision engine.
// The goal is to keep LLM reasoning separate from deterministic computation.

const PROVENANCE_KINDS = new Set(['fact', 'calculated', 'estimate', 'prior', 'unknown']);
const DIRECTIONS = new Set(['max', 'min']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasUniqueIds(items = []) {
  const ids = items.map((item) => item?.id).filter(Boolean);
  return ids.length === new Set(ids).size;
}

export function validateDecisionSpec(spec) {
  const errors = [];

  if (!isObject(spec)) return { valid: false, errors: ['spec must be an object'] };
  if (spec.version !== '1.0') errors.push('version must be "1.0"');

  if (!isObject(spec.decision)) {
    errors.push('decision must be an object');
  } else {
    if (!spec.decision.id) errors.push('decision.id is required');
    if (!spec.decision.title) errors.push('decision.title is required');
  }

  if (!Array.isArray(spec.alternatives) || spec.alternatives.length < 2) {
    errors.push('alternatives must contain at least two options');
  } else {
    if (!hasUniqueIds(spec.alternatives)) errors.push('alternative ids must be unique');
    for (const [index, alternative] of spec.alternatives.entries()) {
      if (!alternative?.id) errors.push(`alternatives[${index}].id is required`);
      if (!alternative?.name) errors.push(`alternatives[${index}].name is required`);
    }
  }

  if (spec.criteria !== undefined) {
    if (!Array.isArray(spec.criteria)) {
      errors.push('criteria must be an array');
    } else {
      if (!hasUniqueIds(spec.criteria)) errors.push('criteria ids must be unique');
      for (const [index, criterion] of spec.criteria.entries()) {
        if (!criterion?.id) errors.push(`criteria[${index}].id is required`);
        if (!criterion?.name) errors.push(`criteria[${index}].name is required`);
        if (!DIRECTIONS.has(criterion?.direction)) {
          errors.push(`criteria[${index}].direction must be "max" or "min"`);
        }
        if (criterion?.weight !== undefined &&
            (!Number.isFinite(criterion.weight) || criterion.weight < 0)) {
          errors.push(`criteria[${index}].weight must be a non-negative number`);
        }
      }

      const weighted = spec.criteria.filter((criterion) => criterion?.weight !== undefined);
      if (weighted.length > 0 && weighted.length !== spec.criteria.length) {
        errors.push('either all criteria must have weights or none of them');
      }
      if (weighted.length > 0) {
        const sum = weighted.reduce((total, criterion) => total + criterion.weight, 0);
        if (Math.abs(sum - 1) > 1e-9) errors.push('criterion weights must sum to 1');
      }

      if (Array.isArray(spec.alternatives)) {
        const scored = spec.alternatives.filter((alternative) => alternative?.scores !== undefined);
        if (scored.length > 0 && scored.length !== spec.alternatives.length) {
          errors.push('either all alternatives must have scores or none of them');
        }

        if (scored.length === spec.alternatives.length && scored.length > 0) {
          for (const [alternativeIndex, alternative] of spec.alternatives.entries()) {
            if (!isObject(alternative.scores)) {
              errors.push(`alternatives[${alternativeIndex}].scores must be an object`);
              continue;
            }
            for (const criterion of spec.criteria) {
              if (!criterion?.id) continue;
              if (!Number.isFinite(alternative.scores[criterion.id])) {
                errors.push(
                  `alternatives[${alternativeIndex}].scores.${criterion.id} must be a finite number`,
                );
              }
            }
          }
        }
      }
    }
  }

  if (spec.evidence !== undefined) {
    if (!Array.isArray(spec.evidence)) {
      errors.push('evidence must be an array');
    } else {
      for (const [index, item] of spec.evidence.entries()) {
        if (!item?.id) errors.push(`evidence[${index}].id is required`);
        if (!PROVENANCE_KINDS.has(item?.kind)) {
          errors.push(`evidence[${index}].kind must be fact|calculated|estimate|prior|unknown`);
        }
        if (item?.confidence !== undefined &&
            (!Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1)) {
          errors.push(`evidence[${index}].confidence must be between 0 and 1`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function assertDecisionSpec(spec) {
  const result = validateDecisionSpec(spec);
  if (!result.valid) {
    throw new Error(`invalid DecisionSpec:\n- ${result.errors.join('\n- ')}`);
  }
  return spec;
}

export const decisionSpecConstants = {
  provenanceKinds: [...PROVENANCE_KINDS],
  directions: [...DIRECTIONS],
};
