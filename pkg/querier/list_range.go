package querier

import "github.com/SigNoz/signoz/pkg/querybuilder"

const hourNanos = int64(3_600_000_000_000) // 1 h in ns

type tsRange struct{ fromNS, toNS uint64 }

// slice the timerange into exponentially growing buckets.
func makeBuckets(start, end uint64) []tsRange {
	startNS := querybuilder.ToNanoSecs(start)
	endNS := querybuilder.ToNanoSecs(end)

	// A cursor that reaches the window boundary can leave end <= start; the
	// subtractions below are unsigned and would wrap.
	if endNS <= startNS {
		return nil
	}

	if endNS-startNS <= uint64(hourNanos) {
		return []tsRange{{fromNS: startNS, toNS: endNS}}
	}

	var out []tsRange
	bucket := uint64(hourNanos)
	curEnd := endNS

	for {
		curStart := startNS
		if curEnd-startNS > bucket {
			curStart = curEnd - bucket
		}
		out = append(out, tsRange{fromNS: curStart, toNS: curEnd})

		if curStart == startNS {
			break
		}
		curEnd = curStart
		bucket *= 2
	}
	return out
}
