package scalarstate

import (
	"encoding/binary"
	"fmt"
	"math"
)

// varMomentsState mirrors VarMoments<Float64, 2> in CH's Moments.h:
// three Float64 values written via writeBinaryLittleEndian — count
// (as Float64 — yes, CH stores it as the same T as the moments),
// sum, and sum-of-squares, in that order. 24 bytes total.
//
// We keep the same naive-parallel-variance form CH uses on the
// non-cached path so cached and uncached results stay numerically
// identical (TRD: stddev/var entry).
type varMomentsState struct {
	M0 float64 // count
	M1 float64 // sum
	M2 float64 // sum of squares
}

func decodeVarMoments(b []byte) (*varMomentsState, error) {
	if len(b) != 24 {
		return nil, fmt.Errorf("scalarstate.varMoments: expected 24 bytes, got %d", len(b))
	}
	return &varMomentsState{
		M0: math.Float64frombits(binary.LittleEndian.Uint64(b[0:8])),
		M1: math.Float64frombits(binary.LittleEndian.Uint64(b[8:16])),
		M2: math.Float64frombits(binary.LittleEndian.Uint64(b[16:24])),
	}, nil
}

func mergeVarMoments(states []State) (*varMomentsState, error) {
	out := &varMomentsState{}
	for _, s := range states {
		c, ok := s.(*varMomentsState)
		if !ok {
			return nil, fmt.Errorf("scalarstate.varMoments.merge: bad state type %T", s)
		}
		out.M0 += c.M0
		out.M1 += c.M1
		out.M2 += c.M2
	}
	return out, nil
}

// population variance: (m2 - m1^2/m0) / m0
func varPop(s *varMomentsState) float64 {
	if s.M0 == 0 {
		return math.NaN()
	}
	return (s.M2 - s.M1*s.M1/s.M0) / s.M0
}

// sample variance: (m2 - m1^2/m0) / (m0 - 1)
func varSamp(s *varMomentsState) float64 {
	if s.M0 < 2 {
		return math.NaN()
	}
	return (s.M2 - s.M1*s.M1/s.M0) / (s.M0 - 1)
}

type varPopAgg struct{}

func (varPopAgg) Name() string                  { return "varpop" }
func (varPopAgg) StateFunc(inner string) string { return "varPopState(toFloat64(" + inner + "))" }
func (varPopAgg) StateColumnType() string       { return "AggregateFunction(varPop, Float64)" }
func (varPopAgg) Decode(b []byte) (State, error) {
	return decodeVarMoments(b)
}
func (varPopAgg) Merge(states []State) (State, error) {
	return mergeVarMoments(states)
}
func (varPopAgg) Final(s State) (any, error) {
	v, ok := s.(*varMomentsState)
	if !ok {
		return nil, fmt.Errorf("scalarstate.varPop.final: bad state type %T", s)
	}
	return varPop(v), nil
}

type varSampAgg struct{}

func (varSampAgg) Name() string                  { return "varsamp" }
func (varSampAgg) StateFunc(inner string) string { return "varSampState(toFloat64(" + inner + "))" }
func (varSampAgg) StateColumnType() string       { return "AggregateFunction(varSamp, Float64)" }
func (varSampAgg) Decode(b []byte) (State, error) {
	return decodeVarMoments(b)
}
func (varSampAgg) Merge(states []State) (State, error) {
	return mergeVarMoments(states)
}
func (varSampAgg) Final(s State) (any, error) {
	v, ok := s.(*varMomentsState)
	if !ok {
		return nil, fmt.Errorf("scalarstate.varSamp.final: bad state type %T", s)
	}
	return varSamp(v), nil
}

type stddevPopAgg struct{}

func (stddevPopAgg) Name() string                  { return "stddevpop" }
func (stddevPopAgg) StateFunc(inner string) string { return "stddevPopState(toFloat64(" + inner + "))" }
func (stddevPopAgg) StateColumnType() string       { return "AggregateFunction(stddevPop, Float64)" }
func (stddevPopAgg) Decode(b []byte) (State, error) {
	return decodeVarMoments(b)
}
func (stddevPopAgg) Merge(states []State) (State, error) {
	return mergeVarMoments(states)
}
func (stddevPopAgg) Final(s State) (any, error) {
	v, ok := s.(*varMomentsState)
	if !ok {
		return nil, fmt.Errorf("scalarstate.stddevPop.final: bad state type %T", s)
	}
	return math.Sqrt(varPop(v)), nil
}

type stddevSampAgg struct{}

func (stddevSampAgg) Name() string                  { return "stddevsamp" }
func (stddevSampAgg) StateFunc(inner string) string { return "stddevSampState(toFloat64(" + inner + "))" }
func (stddevSampAgg) StateColumnType() string       { return "AggregateFunction(stddevSamp, Float64)" }
func (stddevSampAgg) Decode(b []byte) (State, error) {
	return decodeVarMoments(b)
}
func (stddevSampAgg) Merge(states []State) (State, error) {
	return mergeVarMoments(states)
}
func (stddevSampAgg) Final(s State) (any, error) {
	v, ok := s.(*varMomentsState)
	if !ok {
		return nil, fmt.Errorf("scalarstate.stddevSamp.final: bad state type %T", s)
	}
	return math.Sqrt(varSamp(v)), nil
}
