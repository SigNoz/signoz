package scalarstate

import (
	"encoding/binary"
	"encoding/hex"
	"math"

	"github.com/SigNoz/signoz/pkg/errors"
)

// avgState mirrors AvgFraction in CH's AggregateFunctionAvg.h for Float64 input.
// CH's serialize writes (numerator: Float64 LE, denominator: VarUInt) — i.e.
// 8 fixed bytes + 1–9 varint bytes, NOT a fixed 16-byte block.
//
// SigNoz's expression rewriter feeds avgState a Nullable(Float64) (multiIf
// returns NULL for non-matching rows). CH wraps that in
// AggregateFunctionNullUnary<serialize_flag=true>, which prefixes the
// nested state with a 1-byte flag: 0 = no non-null value ever seen
// (state ends here), 1 = nested avg state follows.
type avgState struct {
	Num float64
	Den uint64
}

type avgAgg struct{}

func (avgAgg) Name() string                  { return "avg" }
func (avgAgg) StateFunc(inner string) string { return "avgState(toFloat64(" + inner + "))" }
func (avgAgg) StateColumnType() string       { return "AggregateFunction(avg, Float64)" }

func (avgAgg) Decode(b []byte) (State, error) {
	body, ok := stripNullableFlag(b)
	if !ok {
		return &avgState{}, nil
	}
	if len(body) < avgMinNestedBytes {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.avg: need >=%d nested bytes (8 num + 1+ varint den), got %d (hex=%s)", avgMinNestedBytes, len(body), hex.EncodeToString(b))
	}
	num := math.Float64frombits(binary.LittleEndian.Uint64(body[0:8]))
	den, read := binary.Uvarint(body[8:])
	if read <= 0 {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.avg: bad VarUInt denominator (hex=%s)", hex.EncodeToString(b))
	}
	if 8+read != len(body) {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.avg: unexpected trailing bytes (len=%d, consumed=%d, hex=%s)", len(b), 8+read, hex.EncodeToString(b))
	}
	return &avgState{Num: num, Den: den}, nil
}

// avgMinNestedBytes is the smallest valid nested-state size: 8 bytes of
// Float64 numerator + 1-byte VarUInt denominator (denominator < 128).
const avgMinNestedBytes = 9

func (avgAgg) Merge(states []State) (State, error) {
	out := &avgState{}
	for _, s := range states {
		c, ok := s.(*avgState)
		if !ok {
			return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.avg.merge: bad state type %T", s)
		}
		out.Num += c.Num
		out.Den += c.Den
	}
	return out, nil
}

func (avgAgg) Final(s State) (any, error) {
	c, ok := s.(*avgState)
	if !ok {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.avg.final: bad state type %T", s)
	}
	if c.Den == 0 {
		return math.NaN(), nil
	}
	return c.Num / float64(c.Den), nil
}
