// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
package sampling

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.uber.org/atomic"
	"go.uber.org/zap"
)

type FakeTimeProvider struct {
	second int64
}

func (f FakeTimeProvider) getCurSecond() int64 {
	return f.second
}

var traceID = pcommon.TraceID([16]byte{0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x52, 0x96, 0x9A, 0x89, 0x55, 0x57, 0x1A, 0x3F})

func createTrace() *TraceData {
	trace := &TraceData{SpanCount: atomic.NewInt64(1), ReceivedBatches: ptrace.NewTraces()}
	return trace
}

func newTraceWithKV(traceID pcommon.TraceID, key string, val int64) *TraceData {
	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()
	ils := rs.ScopeSpans().AppendEmpty()
	span := ils.Spans().AppendEmpty()
	span.SetTraceID(traceID)
	span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})
	span.SetStartTimestamp(pcommon.NewTimestampFromTime(
		time.Date(2020, 1, 1, 12, 0, 0, 0, time.UTC),
	))
	span.SetEndTimestamp(pcommon.NewTimestampFromTime(
		time.Date(2020, 1, 1, 12, 0, 16, 0, time.UTC),
	))
	span.Attributes().PutInt(key, val)

	return &TraceData{
		ReceivedBatches: traces,
		SpanCount:       atomic.NewInt64(1),
	}
}

func TestCompositeEvaluatorNotSampled(t *testing.T) {

	// Create 2 policies which do not match any trace
	n1 := NewNumericAttributeFilter(zap.NewNop(), "tag", 0, 100)
	n2 := NewNumericAttributeFilter(zap.NewNop(), "tag", 200, 300)
	c := NewComposite(zap.NewNop(), 1000, []SubPolicyEvalParams{{n1, 100}, {n2, 100}}, FakeTimeProvider{})

	trace := createTrace()

	decision, err := c.Evaluate(traceID, trace)
	require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

	// None of the numeric filters should match since input trace data does not contain
	// the "tag", so the decision should be NotSampled.
	expected := NotSampled
	assert.Equal(t, decision, expected)
}

func TestCompositeEvaluatorSampled(t *testing.T) {

	// Create 2 subpolicies. First results in 100% NotSampled, the second in 100% Sampled.
	n1 := NewNumericAttributeFilter(zap.NewNop(), "tag", 0, 100)
	n2 := NewAlwaysSample(zap.NewNop())
	c := NewComposite(zap.NewNop(), 1000, []SubPolicyEvalParams{{n1, 100}, {n2, 100}}, FakeTimeProvider{})

	trace := createTrace()

	decision, err := c.Evaluate(traceID, trace)
	require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

	// The second policy is AlwaysSample, so the decision should be Sampled.
	expected := Sampled
	assert.Equal(t, decision, expected)
}

func TestCompositeEvaluator_OverflowAlwaysSampled(t *testing.T) {

	timeProvider := &FakeTimeProvider{second: 0}

	// Create 2 subpolicies. First results in 100% NotSampled, the second in 100% Sampled.
	n1 := NewNumericAttributeFilter(zap.NewNop(), "tag", 0, 100)
	n2 := NewAlwaysSample(zap.NewNop())
	c := NewComposite(zap.NewNop(), 3, []SubPolicyEvalParams{{n1, 1}, {n2, 1}}, timeProvider)

	trace := newTraceWithKV(traceID, "tag", int64(10))

	decision, err := c.Evaluate(traceID, trace)
	require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

	// The first policy is NewNumericAttributeFilter and trace tag matches criteria, so the decision should be Sampled.
	expected := Sampled
	assert.Equal(t, decision, expected)

	trace = newTraceWithKV(traceID, "tag", int64(11))

	decision, err = c.Evaluate(traceID, trace)
	require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

	// The first policy is NewNumericAttributeFilter and trace tag matches criteria, so the decision should be Sampled.
	expected = NotSampled
	assert.Equal(t, decision, expected)

	trace = newTraceWithKV(traceID, "tag", int64(1001))
	decision, err = c.Evaluate(traceID, trace)
	require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

	// The first policy fails as the tag value is higher than the range set where as the second policy is AlwaysSample, so the decision should be Sampled.
	expected = Sampled
	assert.Equal(t, decision, expected)
}

func TestCompositeEvaluatorSampled_AlwaysSampled(t *testing.T) {

	// Create 2 subpolicies. First results in 100% NotSampled, the second in 100% Sampled.
	n1 := NewNumericAttributeFilter(zap.NewNop(), "tag", 0, 100)
	n2 := NewAlwaysSample(zap.NewNop())
	c := NewComposite(zap.NewNop(), 10, []SubPolicyEvalParams{{n1, 20}, {n2, 20}}, FakeTimeProvider{})

	for i := 1; i <= 10; i++ {
		trace := createTrace()

		decision, err := c.Evaluate(traceID, trace)
		require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

		// The second policy is AlwaysSample, so the decision should be Sampled.
		expected := Sampled
		assert.Equal(t, decision, expected)
	}
}

func TestCompositeEvaluatorInverseSampled_AlwaysSampled(t *testing.T) {

	// The first policy does not match, the second matches through invert
	n1 := NewStringAttributeFilter(zap.NewNop(), "tag", []string{"foo"}, false, 0, false)
	n2 := NewStringAttributeFilter(zap.NewNop(), "tag", []string{"foo"}, false, 0, true)
	c := NewComposite(zap.NewNop(), 10, []SubPolicyEvalParams{{n1, 20}, {n2, 20}}, FakeTimeProvider{})

	for i := 1; i <= 10; i++ {
		trace := createTrace()

		decision, err := c.Evaluate(traceID, trace)
		require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

		// The second policy is AlwaysSample, so the decision should be Sampled.
		expected := Sampled
		assert.Equal(t, decision, expected)
	}
}

func TestCompositeEvaluatorThrottling(t *testing.T) {

	// Create only one subpolicy, with 100% Sampled policy.
	n1 := NewAlwaysSample(zap.NewNop())
	timeProvider := &FakeTimeProvider{second: 0}
	const totalSPS = 10
	c := NewComposite(zap.NewNop(), totalSPS, []SubPolicyEvalParams{{n1, totalSPS}}, timeProvider)

	trace := createTrace()

	// First totalSPS traces should be 100% Sampled
	for i := 0; i < totalSPS; i++ {
		decision, err := c.Evaluate(traceID, trace)
		require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

		expected := Sampled
		assert.Equal(t, decision, expected)
	}

	// Now we hit the rate limit, so subsequent evaluations should result in 100% NotSampled
	for i := 0; i < totalSPS; i++ {
		decision, err := c.Evaluate(traceID, trace)
		require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

		expected := NotSampled
		assert.Equal(t, decision, expected)
	}

	// Let the time advance by one second.
	timeProvider.second++

	// Subsequent sampling should be Sampled again because it is a new second.
	for i := 0; i < totalSPS; i++ {
		decision, err := c.Evaluate(traceID, trace)
		require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

		expected := Sampled
		assert.Equal(t, decision, expected)
	}
}

func TestCompositeEvaluator2SubpolicyThrottling(t *testing.T) {

	n1 := NewNumericAttributeFilter(zap.NewNop(), "tag", 0, 100)
	n2 := NewAlwaysSample(zap.NewNop())
	timeProvider := &FakeTimeProvider{second: 0}
	const totalSPS = 10
	c := NewComposite(zap.NewNop(), totalSPS, []SubPolicyEvalParams{{n1, totalSPS / 2}, {n2, totalSPS / 2}}, timeProvider)

	trace := createTrace()

	// We have 2 subpolicies, so each should initially get half the bandwidth

	// First totalSPS/2 should be Sampled until we hit the rate limit
	for i := 0; i < totalSPS/2; i++ {
		decision, err := c.Evaluate(traceID, trace)
		require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

		expected := Sampled
		if decision != expected {
			t.Fatalf("Incorrect decision by composite policy evaluator: expected %v, actual %v", expected, decision)
		}
	}

	// Now we hit the rate limit for second subpolicy, so subsequent evaluations should result in NotSampled
	for i := 0; i < totalSPS/2; i++ {
		decision, err := c.Evaluate(traceID, trace)
		require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

		expected := NotSampled
		if decision != expected {
			t.Fatalf("Incorrect decision by composite policy evaluator: expected %v, actual %v", expected, decision)
		}
	}

	// Let the time advance by one second.
	timeProvider.second++

	// It is a new second, so we should start sampling again.
	for i := 0; i < totalSPS/2; i++ {
		decision, err := c.Evaluate(traceID, trace)
		require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

		expected := Sampled
		assert.Equal(t, decision, expected)
	}

	// Now let's hit the hard limit and exceed the total by a factor of 2
	for i := 0; i < 2*totalSPS; i++ {
		decision, err := c.Evaluate(traceID, trace)
		require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

		expected := NotSampled
		assert.Equal(t, decision, expected)
	}

	// Let the time advance by one second.
	timeProvider.second++

	// It is a new second, so we should start sampling again.
	for i := 0; i < totalSPS/2; i++ {
		decision, err := c.Evaluate(traceID, trace)
		require.NoError(t, err, "Failed to evaluate composite policy: %v", err)

		expected := Sampled
		assert.Equal(t, decision, expected)
	}
}
