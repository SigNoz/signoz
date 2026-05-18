package scalarstate

import (
	"encoding/binary"
	"encoding/hex"
	"math"

	"github.com/SigNoz/signoz/pkg/errors"
)

// singleValueState mirrors CH's SingleValueDataFixed<Float64>::serialize:
//
//	writeBinary(has_value, buf)              // 1 byte (UInt8)
//	if (has_value) writeBinary(value, buf)   // 8 bytes Float64 LE
//
// For min/max over Float64 expressions (which is what aggExprRewriter
// produces because Numeric=true is rewritten to FieldDataTypeFloat64),
// the unwrapped blob is either singleValueAbsentBytes (no value) or
// singleValuePresentBytes (has value + payload). When the input is
// Nullable (SigNoz's multiIf path), CH further wraps the state with a
// 1-byte Null-flag — see stripNullableFlag in registry.go.
type singleValueState struct {
	Has   bool
	Value float64
}

const (
	singleValueAbsentBytes  = 1 // [has=0]
	singleValuePresentBytes = 9 // [has=1][8-byte Float64]
)

func decodeSingleValue(b []byte) (*singleValueState, error) {
	body, ok := stripNullableFlag(b)
	if !ok {
		return &singleValueState{}, nil
	}
	if len(body) == 0 {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.singleValue: empty nested blob (hex=%s)", hex.EncodeToString(b))
	}
	has := body[0] != 0
	out := &singleValueState{Has: has}
	if !has {
		if len(body) != singleValueAbsentBytes {
			return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.singleValue: expected %d nested byte for has=false, got %d (hex=%s)", singleValueAbsentBytes, len(body), hex.EncodeToString(b))
		}
		return out, nil
	}
	if len(body) != singleValuePresentBytes {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.singleValue: expected %d nested bytes for has=true, got %d (hex=%s)", singleValuePresentBytes, len(body), hex.EncodeToString(b))
	}
	out.Value = math.Float64frombits(binary.LittleEndian.Uint64(body[1:singleValuePresentBytes]))
	return out, nil
}

type minAgg struct{}

func (minAgg) Name() string                  { return "min" }
func (minAgg) StateFunc(inner string) string { return "minState(toFloat64(" + inner + "))" }
func (minAgg) StateColumnType() string       { return "AggregateFunction(min, Float64)" }

func (minAgg) Decode(b []byte) (State, error) { return decodeSingleValue(b) }

func (minAgg) Merge(states []State) (State, error) {
	out := &singleValueState{}
	for _, s := range states {
		c, ok := s.(*singleValueState)
		if !ok {
			return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.min.merge: bad state type %T", s)
		}
		if !c.Has {
			continue
		}
		if !out.Has || c.Value < out.Value {
			out.Has = true
			out.Value = c.Value
		}
	}
	return out, nil
}

func (minAgg) Final(s State) (any, error) {
	c, ok := s.(*singleValueState)
	if !ok {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.min.final: bad state type %T", s)
	}
	if !c.Has {
		return math.NaN(), nil
	}
	return c.Value, nil
}

type maxAgg struct{}

func (maxAgg) Name() string                  { return "max" }
func (maxAgg) StateFunc(inner string) string { return "maxState(toFloat64(" + inner + "))" }
func (maxAgg) StateColumnType() string       { return "AggregateFunction(max, Float64)" }

func (maxAgg) Decode(b []byte) (State, error) { return decodeSingleValue(b) }

func (maxAgg) Merge(states []State) (State, error) {
	out := &singleValueState{}
	for _, s := range states {
		c, ok := s.(*singleValueState)
		if !ok {
			return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.max.merge: bad state type %T", s)
		}
		if !c.Has {
			continue
		}
		if !out.Has || c.Value > out.Value {
			out.Has = true
			out.Value = c.Value
		}
	}
	return out, nil
}

func (maxAgg) Final(s State) (any, error) {
	c, ok := s.(*singleValueState)
	if !ok {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.max.final: bad state type %T", s)
	}
	if !c.Has {
		return math.NaN(), nil
	}
	return c.Value, nil
}
