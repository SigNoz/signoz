package scalarstate

import (
	"encoding/binary"
	"encoding/hex"

	"github.com/SigNoz/signoz/pkg/errors"
)

type countState struct{ Count uint64 }

type countAgg struct{}

func (countAgg) Name() string                  { return "count" }
func (countAgg) StateFunc(inner string) string { return "countState(" + inner + ")" }
func (countAgg) StateColumnType() string       { return "AggregateFunction(count)" }

// AggregateFunctionCount serializes via writeVarUInt — LEB128, 1–9 bytes,
// not a fixed UInt64. Matches Go's binary.Uvarint encoding.
func (countAgg) Decode(b []byte) (State, error) {
	n, read := binary.Uvarint(b)
	if read <= 0 {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.count: bad VarUInt (hex=%s)", hex.EncodeToString(b))
	}
	if read != len(b) {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.count: unexpected trailing bytes (len=%d, consumed=%d, hex=%s)", len(b), read, hex.EncodeToString(b))
	}
	return &countState{Count: n}, nil
}

func (countAgg) Merge(states []State) (State, error) {
	out := &countState{}
	for _, s := range states {
		c, ok := s.(*countState)
		if !ok {
			return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.count.merge: bad state type %T", s)
		}
		out.Count += c.Count
	}
	return out, nil
}

func (countAgg) Final(s State) (any, error) {
	c, ok := s.(*countState)
	if !ok {
		return nil, errors.NewInternalf(errors.CodeInternal, "scalarstate.count.final: bad state type %T", s)
	}
	return c.Count, nil
}
