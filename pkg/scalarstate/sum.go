package scalarstate

import (
	"encoding/binary"
	"encoding/hex"
	"math"

	"github.com/SigNoz/signoz/pkg/errors"
)

type sumState struct{ Sum float64 }

type sumAgg struct{}

func (sumAgg) Name() string                  { return "sum" }
func (sumAgg) StateFunc(inner string) string { return "sumState(toFloat64(" + inner + "))" }
func (sumAgg) StateColumnType() string       { return "AggregateFunction(sum, Float64)" }

// sumNestedBytes is the size of the nested AggregateFunctionSumData<Float64>
// state: a single Float64 sum, written via writeBinaryLittleEndian.
const sumNestedBytes = 8

// CH wraps sumState(Nullable(Float64)) with a 1-byte "has non-null value"
// flag — see stripNullableFlag in registry.go.
func (sumAgg) Decode(b []byte) (State, error) {
	body, ok := stripNullableFlag(b)
	if !ok {
		return &sumState{}, nil
	}
	if len(body) != sumNestedBytes {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.sum: expected %d nested bytes, got %d (hex=%s)", sumNestedBytes, len(body), hex.EncodeToString(b))
	}
	return &sumState{Sum: math.Float64frombits(binary.LittleEndian.Uint64(body))}, nil
}

func (sumAgg) Merge(states []State) (State, error) {
	out := &sumState{}
	for _, s := range states {
		c, ok := s.(*sumState)
		if !ok {
			return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.sum.merge: bad state type %T", s)
		}
		out.Sum += c.Sum
	}
	return out, nil
}

func (sumAgg) Final(s State) (any, error) {
	c, ok := s.(*sumState)
	if !ok {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.sum.final: bad state type %T", s)
	}
	return c.Sum, nil
}
