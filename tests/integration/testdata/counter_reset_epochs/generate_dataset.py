#!/usr/bin/env python3
"""One-day counter-reset verification dataset + independent ground truth.

Generates:
  inserts.sql            raw samples (shuffled chunks, one duplicated chunk) + time series rows
  expected/<case>.csv    per-query expected output (ts_s, scenario, value)
  report.txt             cross-implementation assertions (bucket-spec vs point-truth,
                         zoom consistency, legacy parity/inconsistency demos)

Three independent reference implementations:
  bucket_spec  : the epoch contribution rules from the design (per step-bucket maps)
  legacy_spec  : the current production semantics (bucket max + negative-diff pair rule)
  point_truth  : per-point epoch-aware accumulation, knows nothing about buckets
Exact equality between bucket_spec and point_truth on every pure-epoch scenario is
the core correctness claim; the SQL pipelines are then compared against these CSVs.
"""

import csv
import math
import os
import random
import sys

B = 1784332800000  # 2026-07-18T00:00:00Z in ms
H = 3600000
DAY = 86400000
END = B + DAY
METRIC = "it_counter_total"

E_OLD = B - 90000000  # an epoch that began ~25h before the day starts


def rng(a, b, n):
    return [a + i * b for i in range(n)]


# ---------------------------------------------------------------- scenarios --
# each sample: (t_ms, value, start_ts_ms)

def s01_steady():
    pts = []
    t = B - H
    i = 0
    while t < END + 300000:
        pts.append((t, 1000.0 + 2 * i, E_OLD))
        t += 30000
        i += 1
    return pts


def s02_midreset():
    pts = []
    reset_at = B + 6 * H + 130000  # 06:02:10, mid 5m and mid 60s bucket
    e2 = reset_at
    t = B - H
    i = 0
    while t < reset_at:
        pts.append((t, 500.0 + 3 * i, E_OLD))
        t += 30000
        i += 1
    t = B + 6 * H + 150000  # 06:02:30
    j = 0
    while t < END + 300000:
        pts.append((t, 7.0 + 3 * j, e2))
        t += 30000
        j += 1
    return pts


def s03_multireset():
    pts = []
    resets = [B + 2 * H * i + 45000 for i in range(1, 12)]  # 02:00:45 .. 22:00:45
    t = B - H
    epoch = E_OLD
    k = 0
    while t < END + 300000:
        while resets and t >= resets[0]:
            epoch = resets.pop(0)
            k = 0
        pts.append((t, 100.0 + 1 * k, epoch))
        t += 30000
        k += 1
    return pts


def s04_regrow():
    pts = []
    t = B - H
    i = 0
    last = 0.0
    while t <= B + 12 * H:
        last = 200.0 + 5 * i
        pts.append((t, last, E_OLD))
        t += 60000
        i += 1
    e2 = B + 12 * H + 30000
    t = B + 12 * H + 60000
    j = 0
    while t < END + 300000:
        # first post-reset export already above the pre-reset last value:
        # invisible to value-based detection
        pts.append((t, last + 100.0 + 50 * j, e2))
        t += 60000
        j += 1
    return pts


def s05_legacy():
    pts = []
    t = B - H
    v = 300.0
    while t < END + 300000:
        if t == B + 8 * H + 90000:
            v = 5.0
        elif t == B + 16 * H + 90000:
            v = 11.0
        pts.append((t, v, 0))
        v += 2
        t += 30000
    return pts


def s06_transition():
    pts = []
    e6 = B - 50000000
    e6b = B + 18 * H + 15000
    t = B - H
    v = 700.0
    while t < END + 300000:
        if t < B + 12 * H:
            s = 0
        elif t < B + 18 * H + 15000:
            s = e6
        else:
            if s != e6b:
                v = 3.0  # the real reset at 18:00:15
            s = e6b
        pts.append((t, v, s))
        v += 2
        t += 30000
    return pts


def s07_gap():
    pts = []
    t = B - H
    while t < END + 300000:
        if not (B + 10 * H <= t < B + 10 * H + 600000):
            pts.append((t, 1997.0, E_OLD))
        t += 60000
    return pts


def s08_singlepoint():
    return [(B + 15 * H, 42.0, B + 15 * H - 60000)]


def s09_slow():
    pts = []
    t = B - H
    i = 0
    while t <= B + 20 * H:
        pts.append((t, 50.0 + 10 * i, E_OLD))
        t += 300000
        i += 1
    e2 = B + 20 * H + 150000
    t = B + 20 * H + 300000
    j = 0
    while t < END + 300000:
        pts.append((t, 4.0 + 10 * j, e2))
        t += 300000
        j += 1
    return pts


def s10_boundaryreset():
    pts = []
    t = B - H
    i = 0
    while t <= B + 4 * H - 30000:
        pts.append((t, 800.0 + 4 * i, E_OLD))
        t += 30000
        i += 1
    e2 = B + 4 * H - 5000
    t = B + 4 * H  # first post-reset sample exactly on the bucket boundary
    j = 0
    while t < END + 300000:
        pts.append((t, 2.0 + 4 * j, e2))
        t += 30000
        j += 1
    return pts


def s11_dupooo():
    pts = []
    reset_at = B + 9 * H + 45000
    e2 = reset_at
    t = B - H
    i = 0
    while t < reset_at:
        pts.append((t, 250.0 + 2 * i, E_OLD))
        t += 30000
        i += 1
    t = B + 9 * H + 60000
    j = 0
    while t < END + 300000:
        pts.append((t, 6.0 + 2 * j, e2))
        t += 30000
        j += 1
    return pts


def s12_twowriter():
    ea, eb = E_OLD, B - 80000000
    pts = []
    t = B - H
    i = 0
    while t < END + 300000:
        pts.append((t, 100.0 + 1 * i, ea))
        t += 60000
        i += 1
    t = B - H + 30000
    i = 0
    while t < END + 300000:
        pts.append((t, 5000.0 + 5 * i, eb))
        t += 60000
        i += 1
    return sorted(pts)


def s14_updown():
    pts = []
    t = B - H
    i = 0
    while t < END + 300000:
        k = i % 40
        tri = k if k < 20 else 40 - k
        pts.append((t, 500.0 + tri * 10.0, 0))
        t += 30000
        i += 1
    return pts


def s15_aggold():
    # rollup rows written BEFORE migration 1012: they exist only in the agg
    # tables, with empty epoch maps. One reset (a value drop) at 14:05.
    pts = []
    t = B - H
    v = 10.0
    while t < END + 300000:
        if t == B + 14 * H + 300000:
            v = 3.0
        pts.append((t, v, 0))
        v += 5
        t += 300000
    return pts


def s16_stale():
    # steady counter with no-recorded-value markers (flags bit 0 set, value 0)
    # in the middle: the markers must be completely invisible to rate/increase
    pts = []
    t = B - H
    i = 0
    while t < END + 300000:
        pts.append((t, 400.0 + 2 * i, E_OLD))
        t += 30000
        i += 1
    return pts


# (t_ms,) marker rows for s16, inserted with flags=1, value=0, start_ts=0
S16_MARKERS = [B + 11 * H + 15000, B + 11 * H + 45000]


SCENARIOS = {
    "s01_steady": (101, s01_steady()),
    "s02_midreset": (102, s02_midreset()),
    "s03_multireset": (103, s03_multireset()),
    "s04_regrow": (104, s04_regrow()),
    "s05_legacy": (105, s05_legacy()),
    "s06_transition": (106, s06_transition()),
    "s07_gap": (107, s07_gap()),
    "s08_singlepoint": (108, s08_singlepoint()),
    "s09_slow": (109, s09_slow()),
    "s10_boundaryreset": (110, s10_boundaryreset()),
    "s11_dupooo": (111, s11_dupooo()),
    "s12_twowriter": (112, s12_twowriter()),
    "s14_updown": (114, s14_updown()),
    "s15_aggold": (115, s15_aggold()),
    "s16_stale": (116, s16_stale()),
}

PURE_EPOCH = [
    "s01_steady", "s02_midreset", "s03_multireset", "s04_regrow", "s07_gap",
    "s08_singlepoint", "s09_slow", "s10_boundaryreset", "s11_dupooo", "s12_twowriter",
    "s16_stale",
]
ALL_KEY0 = ["s05_legacy", "s14_updown"]
# rollup rows from before the migration exist only in the agg tables
AGG_ONLY = {"s15_aggold"}
# cases whose SQL reads a rollup table: the explicitly hinted ones, plus the
# step-86400 "raw" cases whose 48h fetch range (day + day lookback) makes
# WhichSamplesTableToUse pick agg_5m automatically
AGG_CASES = {
    "e_inc_300_agg5m", "e_inc_1800_agg30m", "e_inc_86400_agg30m",
    "e_inc_86400_raw", "l_inc_86400_raw",
}


# ------------------------------------------------------- reference engines --

def buckets_of(points, step_s, adj_start, adj_end):
    """bucket_ts(s) -> {epoch: (fval, lval)} plus key-0 presence, from raw points."""
    out = {}
    for (t, v, s) in points:
        if not (adj_start <= t < adj_end):
            continue
        b = (t // 1000) // step_s * step_s
        d = out.setdefault(b, {})
        if s in d:
            f, l = d[s]
            d[s] = (min(f, v), max(l, v))
        else:
            d[s] = (v, v)
    return out


def bucket_spec(points, step_s, adj_start, adj_end, display_start, time_agg):
    """The epoch contribution rules from the design. Returns {ts_s: value}, NaN rows omitted."""
    bks = buckets_of(points, step_s, adj_start, adj_end)
    res = {}
    prev_lval = {}
    prev_v0 = None
    ever_had0 = False
    prev_bucket_max = None
    prev_bucket_ts = None
    rn = 0
    for b in sorted(bks):
        rn += 1
        d = bks[b]
        has0 = 0 in d
        v0 = d[0][1] if has0 else None
        bucket_max = max(l for (_, l) in d.values())
        contribs = []
        for epoch, (fval, lval) in d.items():
            if epoch != 0:
                if epoch in prev_lval:
                    c = lval - prev_lval[epoch] if lval >= prev_lval[epoch] else lval
                elif has0 or ever_had0:
                    seam = v0 if has0 else prev_v0
                    c = lval - (seam if fval >= seam else 0.0)
                elif epoch >= adj_start:
                    c = lval
                else:
                    c = lval - fval
            else:
                if rn == 1:
                    c = math.nan
                elif v0 < prev_bucket_max:
                    c = v0
                else:
                    c = v0 - prev_bucket_max
            contribs.append(c)
        finite = [c for c in contribs if not math.isnan(c)]
        inc = sum(finite) if finite else math.nan
        if time_agg == "rate" and not math.isnan(inc):
            denom = (b - prev_bucket_ts) if rn > 1 else step_s
            inc = inc / denom
        if b >= display_start // 1000 and not math.isnan(inc):
            res[b] = inc
        # state updates (after the whole bucket)
        for epoch, (_, lval) in d.items():
            if epoch != 0:
                prev_lval[epoch] = lval
        if has0:
            prev_v0 = v0
            ever_had0 = True
        prev_bucket_max = bucket_max
        prev_bucket_ts = b
    return res


def legacy_spec(points, step_s, adj_start, adj_end, display_start, time_agg):
    """Current production semantics: bucket max + negative-diff pair rule."""
    bks = buckets_of(points, step_s, adj_start, adj_end)
    res = {}
    prev = None
    prev_ts = None
    rn = 0
    for b in sorted(bks):
        rn += 1
        v = max(l for (_, l) in bks[b].values())
        if rn == 1:
            val = math.nan
        elif v < prev:
            val = v if time_agg == "increase" else v / (b - prev_ts)
        else:
            val = (v - prev) if time_agg == "increase" else (v - prev) / (b - prev_ts)
        if b >= display_start // 1000 and not math.isnan(val):
            res[b] = val
        prev = v
        prev_ts = b
    return res


def point_truth(points, step_s, adj_start, adj_end, display_start):
    """Per-point epoch-aware increase, attributed to the later point's bucket.
    Independent of the bucket machinery entirely. Only valid for series whose
    non-zero epochs are trustworthy (pure-epoch scenarios)."""
    last = {}
    res = {}
    for (t, v, s) in sorted(points):
        if not (adj_start <= t < adj_end):
            continue
        b = (t // 1000) // step_s * step_s
        c = None
        if s in last:
            c = max(0.0, v - last[s])
        else:
            if s >= adj_start:
                c = v  # epoch born inside the fetched range: counts from 0
            # else: first observation of a pre-range epoch, no attributable growth
        last[s] = v
        if c is not None and b >= display_start // 1000:
            res[b] = res.get(b, 0.0) + c
    return res


# ------------------------------------------------------------------- emit --

CASES = [
    # name, engine, step_s, time_agg
    ("e_inc_60_raw", "epoch", 60, "increase"),
    ("e_inc_300_raw", "epoch", 300, "increase"),
    ("e_inc_300_agg5m", "epoch", 300, "increase"),
    ("e_inc_1800_agg30m", "epoch", 1800, "increase"),
    ("e_inc_86400_raw", "epoch", 86400, "increase"),
    ("e_inc_86400_agg30m", "epoch", 86400, "increase"),
    ("e_rate_300_raw", "epoch", 300, "rate"),
    ("l_inc_60_raw", "legacy", 60, "increase"),
    ("l_inc_300_raw", "legacy", 300, "increase"),
    ("l_inc_86400_raw", "legacy", 86400, "increase"),
    ("l_rate_300_raw", "legacy", 300, "rate"),
]


def query_window(step_s):
    aligned_start = B - B % (step_s * 1000)
    adj_start = aligned_start - step_s * 1000
    adj_end = END - END % (min(step_s, 60) * 1000)
    return adj_start, adj_end, aligned_start  # display start = aligned start


def main(outdir):
    os.makedirs(os.path.join(outdir, "expected"), exist_ok=True)
    random.seed(42)

    # ---- inserts.sql
    lines = []
    lines.append("SET max_partitions_per_insert_block = 1000;")
    chunks = []
    for name, (fp, pts) in SCENARIOS.items():
        if name in AGG_ONLY:
            continue
        rows = [
            f"('default','Cumulative','{METRIC}',{fp},{t},{v!r},0,{B},{s})"
            for (t, v, s) in pts
        ]
        # 500-row chunks; separate INSERTs create separate parts
        for i in range(0, len(rows), 500):
            chunks.append((name, rows[i:i + 500]))
    # no-recorded-value markers: flags=1, value 0, no epoch
    s16fp = SCENARIOS["s16_stale"][0]
    chunks.append(("s16_markers", [
        f"('default','Cumulative','{METRIC}',{s16fp},{t},0.0,1,{B},0)" for t in S16_MARKERS
    ]))
    random.shuffle(chunks)
    # duplicate one s11 chunk to prove replay-safety
    dup = next(c for c in chunks if c[0] == "s11_dupooo")
    chunks.append(dup)
    for _, rows in chunks:
        lines.append(
            "INSERT INTO signoz_metrics.samples_v4 "
            "(env, temporality, metric_name, fingerprint, unix_milli, value, flags, inserted_at_unix_milli, start_ts) VALUES "
            + ",".join(rows) + ";"
        )
    # pre-migration rollup rows: written straight to the agg tables with empty
    # epoch maps (the state migration 1012 leaves behind for old data)
    s15fp, s15pts = SCENARIOS["s15_aggold"]
    rows5m = [
        f"('default','Cumulative','{METRIC}',{s15fp},{t},{v!r},{v!r},{v!r},{v!r},1)"
        for (t, v, _) in s15pts
    ]
    # the 30m rows come from the chained samples_v4_agg_30m_mv, which fires on
    # direct agg_5m inserts exactly as it does for MV-produced ones
    lines.append(
        "INSERT INTO signoz_metrics.samples_v4_agg_5m "
        "(env, temporality, metric_name, fingerprint, unix_milli, last, min, max, sum, count) VALUES "
        + ",".join(rows5m) + ";"
    )
    for name, (fp, _) in SCENARIOS.items():
        labels = (
            '{"__name__":"' + METRIC + '","scenario":"' + name + '"}'
        ).replace("'", "\\'")
        for day in (B - DAY, B):
            lines.append(
                "INSERT INTO signoz_metrics.time_series_v4_1day "
                "(env, temporality, metric_name, fingerprint, unix_milli, labels) VALUES "
                f"('default','Cumulative','{METRIC}',{fp},{day},'{labels}');"
            )
    with open(os.path.join(outdir, "inserts.sql"), "w") as f:
        f.write("\n".join(lines) + "\n")

    # ---- expected CSVs
    engines = {"epoch": bucket_spec, "legacy": legacy_spec}
    for case, engine, step_s, time_agg in CASES:
        adj_start, adj_end, display = query_window(step_s)
        with open(os.path.join(outdir, "expected", case + ".csv"), "w", newline="") as f:
            w = csv.writer(f)
            for name in sorted(SCENARIOS):
                if name in AGG_ONLY and case not in AGG_CASES:
                    continue
                fp, pts = SCENARIOS[name]
                res = engines[engine](pts, step_s, adj_start, adj_end, display, time_agg)
                for b in sorted(res):
                    w.writerow([b, name, repr(res[b])])

    # ---- cross-implementation assertions
    failures = []
    report = []

    # A1: bucket_spec total == point_truth total on pure-epoch scenarios, per step
    for step_s in (60, 300, 1800, 86400):
        adj_start, adj_end, display = query_window(step_s)
        for name in PURE_EPOCH:
            fp, pts = SCENARIOS[name]
            spec = bucket_spec(pts, step_s, adj_start, adj_end, display, "increase")
            truth = point_truth(pts, step_s, adj_start, adj_end, display)
            st, tt = sum(spec.values()), sum(truth.values())
            ok = math.isclose(st, tt, rel_tol=1e-9, abs_tol=1e-6)
            report.append(f"A1 step={step_s:<6} {name:<18} bucket_spec={st:<12g} point_truth={tt:<12g} {'OK' if ok else 'FAIL'}")
            if not ok:
                failures.append(f"A1 {name} step={step_s}: {st} != {tt}")
            # per-bucket equality as well (min/max per epoch are lossless)
            for b in sorted(set(spec) | set(truth)):
                sv, tv = spec.get(b, 0.0), truth.get(b, 0.0)
                if not math.isclose(sv, tv, rel_tol=1e-9, abs_tol=1e-6):
                    failures.append(f"A1b {name} step={step_s} ts={b}: bucket_spec={sv} point_truth={tv}")

    # A3: zoom consistency of the epoch rules across steps. Holds when the
    # one-step lookback covers the series' reporting interval (step >= interval);
    # below that, the growth between the last pre-range sample and the first
    # in-range sample is unattributable — for the epoch rules AND for legacy AND
    # for Prometheus (rate over a window shorter than the scrape interval).
    # s09_slow reports every 300s, so step=60 is excluded there.
    zoom_steps = {name: (60, 300, 1800, 86400) for name in PURE_EPOCH}
    zoom_steps["s09_slow"] = (300, 1800, 86400)
    totals = {}
    for name in PURE_EPOCH:
        fp, pts = SCENARIOS[name]
        for step_s in zoom_steps[name]:
            adj_start, adj_end, display = query_window(step_s)
            res = bucket_spec(pts, step_s, adj_start, adj_end, display, "increase")
            totals.setdefault(name, {})[step_s] = sum(res.values())
    for name, per_step in totals.items():
        vals = list(per_step.values())
        ok = all(math.isclose(v, vals[0], rel_tol=1e-9, abs_tol=1e-6) for v in vals)
        report.append(f"A3 zoom {name:<18} totals={ {k: round(v, 6) for k, v in per_step.items()} } {'OK' if ok else 'FAIL'}")
        if not ok:
            failures.append(f"A3 {name}: totals differ across steps: {per_step}")

    # A4 (informational): legacy zoom inconsistency on reset scenarios (the Matti bug)
    for name in ("s03_multireset", "s04_regrow"):
        fp, pts = SCENARIOS[name]
        per_step = {}
        for step_s in (60, 86400):
            adj_start, adj_end, display = query_window(step_s)
            per_step[step_s] = sum(legacy_spec(pts, step_s, adj_start, adj_end, display, "increase").values())
        report.append(f"A4 legacy zoom {name}: step60={per_step[60]:g} step86400={per_step[86400]:g} (inconsistent by design of legacy)")

    # A5: all-key-0 scenarios: epoch rules must reproduce legacy exactly
    for step_s in (60, 300, 86400):
        adj_start, adj_end, display = query_window(step_s)
        for name in ALL_KEY0:
            fp, pts = SCENARIOS[name]
            a = bucket_spec(pts, step_s, adj_start, adj_end, display, "increase")
            b_ = legacy_spec(pts, step_s, adj_start, adj_end, display, "increase")
            if set(a) != set(b_) or any(not math.isclose(a[k], b_[k], rel_tol=1e-12) for k in a):
                failures.append(f"A5 {name} step={step_s}: epoch rules != legacy on key-0 data")
            else:
                report.append(f"A5 step={step_s:<6} {name:<18} epoch==legacy OK ({len(a)} buckets)")

    # A6: no-reset / gap scenarios: epoch == legacy (regression safety)
    for step_s in (60, 300):
        adj_start, adj_end, display = query_window(step_s)
        for name in ("s01_steady", "s07_gap"):
            fp, pts = SCENARIOS[name]
            a = bucket_spec(pts, step_s, adj_start, adj_end, display, "increase")
            b_ = legacy_spec(pts, step_s, adj_start, adj_end, display, "increase")
            if set(a) != set(b_) or any(not math.isclose(a[k], b_[k], rel_tol=1e-12) for k in a):
                failures.append(f"A6 {name} step={step_s}: epoch != legacy on clean data")
            else:
                report.append(f"A6 step={step_s:<6} {name:<18} epoch==legacy OK ({len(a)} buckets)")

    with open(os.path.join(outdir, "report.txt"), "w") as f:
        f.write("\n".join(report) + "\n")
        if failures:
            f.write("\nFAILURES:\n" + "\n".join(failures) + "\n")

    print("\n".join(report))
    if failures:
        print("\nFAILURES:")
        print("\n".join(failures))
        sys.exit(1)
    print(f"\ngenerated OK: {sum(len(p) for _, (f_, p) in SCENARIOS.items())} samples, {len(CASES)} expected CSVs")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__)))
