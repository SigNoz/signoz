#!/usr/bin/env python3
"""Compare a query's actual CSV output against the expected CSV.
Rows keyed by (ts_s, scenario); float tolerance 1e-6 relative."""
import csv
import math
import sys


def load(path):
    out = {}
    with open(path, newline="") as f:
        for row in csv.reader(f):
            if not row:
                continue
            out[(int(row[0]), row[1])] = float(row[2])
    return out


def main(expected_path, actual_path):
    exp, act = load(expected_path), load(actual_path)
    bad = []
    for k in sorted(set(exp) | set(act)):
        e, a = exp.get(k), act.get(k)
        if e is None:
            bad.append(f"unexpected row {k}: actual={a}")
        elif a is None:
            bad.append(f"missing row {k}: expected={e}")
        elif not math.isclose(e, a, rel_tol=1e-6, abs_tol=1e-6):
            bad.append(f"mismatch {k}: expected={e} actual={a}")
    if bad:
        print(f"FAIL ({len(bad)} problems, {len(exp)} expected rows)")
        for b in bad[:20]:
            print("  " + b)
        if len(bad) > 20:
            print(f"  ... and {len(bad) - 20} more")
        return 1
    print(f"OK ({len(exp)} rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
