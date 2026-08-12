#!/usr/bin/env bash
# Runs every CLI command against its bundled example. Catches wiring errors that
# unit tests on lib/ cannot see: bad flag names, missing handlers, render crashes.
set -uo pipefail
cd "$(dirname "$0")/.."

CLI="node scripts/calc.js"
fail=0

run() {
  local label="$1"; shift
  if out=$("$@" 2>&1); then
    printf '  ok   %s\n' "$label"
  else
    printf '  FAIL %s\n%s\n' "$label" "$out"
    fail=1
  fi
}

echo "calc CLI smoke test"

run "help"        node scripts/calc.js help
run "meu"         node scripts/calc.js meu examples/meu.json
run "meu --log"   node scripts/calc.js meu examples/meu.json --utility log
run "voi"         node scripts/calc.js voi examples/voi.json
run "allocate"    node scripts/calc.js allocate examples/allocate.json
run "allocate ucb1" node scripts/calc.js allocate examples/allocate.json --strategy ucb1
run "compare"     node scripts/calc.js compare examples/allocate.json
run "precision"   node scripts/calc.js precision --successes 3 --trials 10000
run "samplesize"  node scripts/calc.js samplesize --p 0.002 --rse 0.2
run "importance"  node scripts/calc.js importance --true-rate 0.002 --proposal-rate 0.1 --n 10000
run "pareto"      node scripts/calc.js pareto examples/pareto.json
run "robust"      node scripts/calc.js robust examples/robust.json
run "discount"    node scripts/calc.js discount --half-life 6
run "horizon"     node scripts/calc.js horizon examples/horizon.json
run "prune"       node scripts/calc.js prune examples/prune.json
run "game"        node scripts/calc.js game examples/game.json
run "calibrate"   node scripts/calc.js calibrate examples/calibrate.json
run "credit"      node scripts/calc.js credit examples/credit.json
run "belief"      node scripts/calc.js belief examples/belief.json
run "track"       node scripts/calc.js track examples/track.json
run "json output" node scripts/calc.js voi examples/voi.json --json

echo "adaptive solver CLI smoke test"
run "solve help"      node scripts/problem-solver.js --help
run "solve registry"  node scripts/problem-solver.js registry

# Unknown commands and missing files must fail loudly, not silently succeed.
if node scripts/calc.js nonsense >/dev/null 2>&1; then
  echo "  FAIL unknown command should exit non-zero"; fail=1
else
  echo "  ok   unknown command exits non-zero"
fi
if node scripts/calc.js meu missing.json >/dev/null 2>&1; then
  echo "  FAIL missing file should exit non-zero"; fail=1
else
  echo "  ok   missing file exits non-zero"
fi

exit $fail
