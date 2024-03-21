// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package sampling

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.uber.org/zap"
)

func TestAndEvaluatorNotSampled(t *testing.T) {
	n1 := NewStringAttributeFilter(zap.NewNop(), "name", []string{"value"}, false, 0, false)
	n2, err := NewStatusCodeFilter(zap.NewNop(), []string{"ERROR"})
	if err != nil {
		t.FailNow()
	}

	and := NewAnd(zap.NewNop(), []PolicyEvaluator{n1, n2})

	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()
	ils := rs.ScopeSpans().AppendEmpty()

	span := ils.Spans().AppendEmpty()
	span.Status().SetCode(ptrace.StatusCodeError)
	span.SetTraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})

	trace := &TraceData{
		ReceivedBatches: traces,
	}
	decision, err := and.Evaluate(traceID, trace)
	require.NoError(t, err, "Failed to evaluate and policy: %v", err)
	assert.Equal(t, decision, NotSampled)

}

func TestAndEvaluatorSampled(t *testing.T) {
	n1 := NewStringAttributeFilter(zap.NewNop(), "attribute_name", []string{"attribute_value"}, false, 0, false)
	n2, err := NewStatusCodeFilter(zap.NewNop(), []string{"ERROR"})
	if err != nil {
		t.FailNow()
	}

	and := NewAnd(zap.NewNop(), []PolicyEvaluator{n1, n2})

	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()
	ils := rs.ScopeSpans().AppendEmpty()

	span := ils.Spans().AppendEmpty()
	span.Attributes().PutStr("attribute_name", "attribute_value")
	span.Status().SetCode(ptrace.StatusCodeError)
	span.SetTraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})

	trace := &TraceData{
		ReceivedBatches: traces,
	}
	decision, err := and.Evaluate(traceID, trace)
	require.NoError(t, err, "Failed to evaluate and policy: %v", err)
	assert.Equal(t, decision, Sampled)

}

func TestAndEvaluatorStringInvertSampled(t *testing.T) {
	n1 := NewStringAttributeFilter(zap.NewNop(), "attribute_name", []string{"no_match"}, false, 0, true)
	n2, err := NewStatusCodeFilter(zap.NewNop(), []string{"ERROR"})
	if err != nil {
		t.FailNow()
	}

	and := NewAnd(zap.NewNop(), []PolicyEvaluator{n1, n2})

	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()
	ils := rs.ScopeSpans().AppendEmpty()

	span := ils.Spans().AppendEmpty()
	span.Attributes().PutStr("attribute_name", "attribute_value")
	span.Status().SetCode(ptrace.StatusCodeError)
	span.SetTraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})

	trace := &TraceData{
		ReceivedBatches: traces,
	}
	decision, err := and.Evaluate(traceID, trace)
	require.NoError(t, err, "Failed to evaluate and policy: %v", err)
	assert.Equal(t, decision, Sampled)

}

func TestAndEvaluatorStringInvertNotSampled(t *testing.T) {
	n1 := NewStringAttributeFilter(zap.NewNop(), "attribute_name", []string{"attribute_value"}, false, 0, true)
	n2, err := NewStatusCodeFilter(zap.NewNop(), []string{"ERROR"})
	if err != nil {
		t.FailNow()
	}

	and := NewAnd(zap.NewNop(), []PolicyEvaluator{n1, n2})

	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()
	ils := rs.ScopeSpans().AppendEmpty()

	span := ils.Spans().AppendEmpty()
	span.Attributes().PutStr("attribute_name", "attribute_value")
	span.Status().SetCode(ptrace.StatusCodeError)
	span.SetTraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})

	trace := &TraceData{
		ReceivedBatches: traces,
	}
	decision, err := and.Evaluate(traceID, trace)
	require.NoError(t, err, "Failed to evaluate and policy: %v", err)
	assert.Equal(t, decision, NotSampled)

}
