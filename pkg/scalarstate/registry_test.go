package scalarstate

import (
	"encoding/binary"
	"math"
	"testing"
)

// le64f writes a Float64 as little-endian into the given slice at offset.
func le64f(b []byte, off int, v float64) {
	binary.LittleEndian.PutUint64(b[off:off+8], math.Float64bits(v))
}

func TestRegistryLookup(t *testing.T) {
	cases := []struct {
		name   string
		expect bool
	}{
		{"count", true},
		{"sum", true},
		{"avg", true},
		{"min", true},
		{"max", true},
		{"varpop", true},
		{"stddevpop", true},
		// Sketch aggregates intentionally not registered for v1.
		{"p99", false},
		{"count_distinct", false},
	}
	for _, c := range cases {
		_, ok := Lookup(c.name)
		if ok != c.expect {
			t.Errorf("Lookup(%q): got ok=%v want=%v", c.name, ok, c.expect)
		}
	}
}

func TestCountDecodeMergeFinal(t *testing.T) {
	a, _ := Lookup("count")
	// CH AggregateFunctionCount serializes the count as a VarUInt (LEB128).
	mk := func(n uint64) []byte {
		b := make([]byte, binary.MaxVarintLen64)
		written := binary.PutUvarint(b, n)
		return b[:written]
	}
	s1, err := a.Decode(mk(7))
	if err != nil {
		t.Fatal(err)
	}
	s2, err := a.Decode(mk(13))
	if err != nil {
		t.Fatal(err)
	}
	// Also exercise a value that needs >1 VarUInt byte.
	s3, err := a.Decode(mk(300))
	if err != nil {
		t.Fatal(err)
	}
	merged, err := a.Merge([]State{s1, s2, s3})
	if err != nil {
		t.Fatal(err)
	}
	v, err := a.Final(merged)
	if err != nil {
		t.Fatal(err)
	}
	if got, want := v.(uint64), uint64(320); got != want {
		t.Errorf("count final: got %d want %d", got, want)
	}
}

func TestSumDecodeMergeFinal(t *testing.T) {
	a, _ := Lookup("sum")
	// CH wraps sumState(Nullable(Float64)) with a 1-byte "had non-null
	// value" flag in front of the Float64 sum.
	mk := func(f float64) []byte {
		b := make([]byte, 9)
		b[0] = 1
		le64f(b, 1, f)
		return b
	}
	s1, _ := a.Decode(mk(2.5))
	s2, _ := a.Decode(mk(7.5))
	merged, _ := a.Merge([]State{s1, s2})
	v, _ := a.Final(merged)
	if got := v.(float64); got != 10.0 {
		t.Errorf("sum final: got %v want 10", got)
	}

	// Empty Null-wrapped state (no rows ever contributed): single 0x00 byte.
	empty, err := a.Decode([]byte{0})
	if err != nil {
		t.Fatalf("decode empty: %v", err)
	}
	if got := empty.(*sumState).Sum; got != 0 {
		t.Errorf("empty sum: got %v want 0", got)
	}
}

func TestAvgDecodeMergeFinal(t *testing.T) {
	a, _ := Lookup("avg")
	// Wire shape: [null_flag=1][Float64 num][VarUInt den].
	mk := func(num float64, den uint64) []byte {
		b := make([]byte, 1+8+binary.MaxVarintLen64)
		b[0] = 1
		le64f(b, 1, num)
		w := binary.PutUvarint(b[9:], den)
		return b[:9+w]
	}
	// chunk1: sum=10 over 4 samples, chunk2: sum=20 over 6 samples → avg=3
	s1, _ := a.Decode(mk(10, 4))
	s2, _ := a.Decode(mk(20, 6))
	merged, _ := a.Merge([]State{s1, s2})
	v, _ := a.Final(merged)
	if got := v.(float64); got != 3.0 {
		t.Errorf("avg final: got %v want 3", got)
	}
}

func TestAvgFinalEmptyDenominator(t *testing.T) {
	a, _ := Lookup("avg")
	// Single 0x00: Null-wrapper says no non-null value was ever seen.
	s, err := a.Decode([]byte{0})
	if err != nil {
		t.Fatal(err)
	}
	v, _ := a.Final(s)
	if got := v.(float64); !math.IsNaN(got) {
		t.Errorf("avg final on empty: got %v want NaN", got)
	}
}

func TestMinMaxDecodeMergeFinal(t *testing.T) {
	mn, _ := Lookup("min")
	mx, _ := Lookup("max")

	// Wire shape with Null-wrapper:
	//   has=false: 1 byte  [null_flag=0]                           — never saw a non-null value
	//   has=true:  10 bytes [null_flag=1][has=1][Float64 value LE]
	mk := func(has bool, v float64) []byte {
		if !has {
			return []byte{0}
		}
		b := make([]byte, 10)
		b[0] = 1
		b[1] = 1
		le64f(b, 2, v)
		return b
	}

	// Three chunks: 5.0, missing, -2.0 → min = -2, max = 5
	s1, _ := mn.Decode(mk(true, 5.0))
	s2, _ := mn.Decode(mk(false, 0))
	s3, _ := mn.Decode(mk(true, -2.0))
	merged, _ := mn.Merge([]State{s1, s2, s3})
	v, _ := mn.Final(merged)
	if got := v.(float64); got != -2.0 {
		t.Errorf("min final: got %v want -2", got)
	}

	s1m, _ := mx.Decode(mk(true, 5.0))
	s2m, _ := mx.Decode(mk(false, 0))
	s3m, _ := mx.Decode(mk(true, -2.0))
	mergedM, _ := mx.Merge([]State{s1m, s2m, s3m})
	vm, _ := mx.Final(mergedM)
	if got := vm.(float64); got != 5.0 {
		t.Errorf("max final: got %v want 5", got)
	}

	// All-missing: NaN
	s, _ := mn.Decode(mk(false, 0))
	merged2, _ := mn.Merge([]State{s})
	vNaN, _ := mn.Final(merged2)
	if !math.IsNaN(vNaN.(float64)) {
		t.Errorf("min on all-missing: got %v want NaN", vNaN)
	}
}

func TestVarPopAndStddevPop(t *testing.T) {
	vp, _ := Lookup("varpop")
	sp, _ := Lookup("stddevpop")

	mk := func(count, sum, sumsq float64) []byte {
		b := make([]byte, 24)
		le64f(b, 0, count)
		le64f(b, 8, sum)
		le64f(b, 16, sumsq)
		return b
	}

	// Chunk1: values {1,2}    -> count=2, sum=3, sumsq=5
	// Chunk2: values {3,4,5}  -> count=3, sum=12, sumsq=50
	// Combined: 5 values {1,2,3,4,5}, varPop = mean(x²) - mean(x)²
	//   mean = 3, mean(x²) = (1+4+9+16+25)/5 = 11, varPop = 11 - 9 = 2.
	s1, _ := vp.Decode(mk(2, 3, 5))
	s2, _ := vp.Decode(mk(3, 12, 50))
	merged, _ := vp.Merge([]State{s1, s2})
	v, _ := vp.Final(merged)
	if got := v.(float64); math.Abs(got-2.0) > 1e-9 {
		t.Errorf("varPop final: got %v want 2", got)
	}
	v2, _ := sp.Final(merged)
	if got := v2.(float64); math.Abs(got-math.Sqrt(2.0)) > 1e-9 {
		t.Errorf("stddevPop final: got %v want sqrt(2)", got)
	}
}
