#!/usr/bin/env python3
"""Scikit-Criteria adapter for DecisionSpec MCDA analysis.

Reads a DecisionSpec JSON object from stdin and writes a JSON result to stdout.
The adapter intentionally exposes one default method (TOPSIS) so the LLM does
not choose arbitrarily among dozens of MCDA algorithms.
"""

from __future__ import annotations

import json
import sys


def fail(message: str, code: int = 2) -> None:
    print(json.dumps({"error": message}, ensure_ascii=False), file=sys.stderr)
    raise SystemExit(code)


def load_spec() -> dict:
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON input: {exc}")


def main() -> None:
    try:
        import skcriteria as skc
        from skcriteria.agg.topsis import TOPSIS
        from skcriteria.pipeline import mkpipe
        from skcriteria.preprocessing.invert_objectives import NegateMinimize
        from skcriteria.preprocessing.scalers import SumScaler, VectorScaler
    except ImportError as exc:
        fail(
            "Scikit-Criteria adapter is not installed. "
            "Install requirements-decision-engine.txt. "
            f"Original import error: {exc}",
            code=3,
        )

    spec = load_spec()
    criteria = spec.get("criteria") or []
    alternatives = spec.get("alternatives") or []

    if len(criteria) < 2:
        fail("MCDA requires at least two criteria")
    if len(alternatives) < 2:
        fail("MCDA requires at least two alternatives")
    if not all(isinstance(c.get("weight"), (int, float)) for c in criteria):
        fail("default MCDA route requires an explicit weight for every criterion")

    weights = [float(c["weight"]) for c in criteria]
    if abs(sum(weights) - 1.0) > 1e-9:
        fail("criterion weights must sum to 1")

    criterion_ids = [c["id"] for c in criteria]
    criterion_names = [c.get("name", c["id"]) for c in criteria]
    objectives = [max if c.get("direction") == "max" else min for c in criteria]

    matrix = []
    alternative_names = []
    for alternative in alternatives:
        scores = alternative.get("scores") or {}
        missing = [criterion_id for criterion_id in criterion_ids if criterion_id not in scores]
        if missing:
            fail(f"alternative {alternative.get('id')} is missing scores for: {', '.join(missing)}")
        row = [scores[criterion_id] for criterion_id in criterion_ids]
        if not all(isinstance(value, (int, float)) for value in row):
            fail(f"alternative {alternative.get('id')} has a non-numeric criterion score")
        matrix.append(row)
        alternative_names.append(alternative.get("name", alternative["id"]))

    dm = skc.mkdm(
        matrix=matrix,
        objectives=objectives,
        weights=weights,
        alternatives=alternative_names,
        criteria=criterion_names,
    )

    # TOPSIS pipeline for mixed units: convert minimize objectives, normalize
    # matrix and weights, then rank by distance to ideal/anti-ideal solutions.
    pipeline = mkpipe(
        NegateMinimize(),
        VectorScaler(target="matrix"),
        SumScaler(target="weights"),
        TOPSIS(),
    )
    result = pipeline.evaluate(dm)

    similarity = getattr(result.e_, "similarity", None)
    rows = []
    for index, name in enumerate(result.alternatives.tolist()):
        row = {
            "alternative": name,
            "rank": int(result.rank_[index]),
        }
        if similarity is not None:
            row["score"] = float(similarity[index])
        rows.append(row)

    rows.sort(key=lambda row: row["rank"])

    output = {
        "analysis": "mcda",
        "method": "TOPSIS",
        "implementation": "scikit-criteria",
        "ranking": rows,
        "best": rows[0] if rows else None,
        "reproducibility": {
            "stochastic": False,
            "criteria": criterion_ids,
            "weights": weights,
        },
    }
    json.dump(output, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
