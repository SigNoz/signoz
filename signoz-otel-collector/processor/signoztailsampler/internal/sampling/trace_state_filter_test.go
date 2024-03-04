// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
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
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.uber.org/zap"
)

// TestTraceStateCfg is replicated with StringAttributeCfg
type TestTraceStateCfg struct {
	Key    string
	Values []string
}

func TestTraceStateFilter(t *testing.T) {

	cases := []struct {
		Desc      string
		Trace     *TraceData
		filterCfg *TestTraceStateCfg
		Decision  Decision
	}{
		{
			Desc:      "nonmatching trace_state key",
			Trace:     newTraceState("non_matching=value"),
			filterCfg: &TestTraceStateCfg{Key: "example", Values: []string{"value"}},
			Decision:  NotSampled,
		},
		{
			Desc:      "nonmatching trace_state value",
			Trace:     newTraceState("example=non_matching"),
			filterCfg: &TestTraceStateCfg{Key: "example", Values: []string{"value"}},
			Decision:  NotSampled,
		},
		{
			Desc:      "matching trace_state",
			Trace:     newTraceState("example=value"),
			filterCfg: &TestTraceStateCfg{Key: "example", Values: []string{"value"}},
			Decision:  Sampled,
		},
		{
			Desc:      "nonmatching trace_state on empty filter list",
			Trace:     newTraceState("example=value"),
			filterCfg: &TestTraceStateCfg{Key: "example", Values: []string{}},
			Decision:  NotSampled,
		},
		{
			Desc:      "nonmatching trace_state on multiple key-values",
			Trace:     newTraceState("example=non_matching,non_matching=value"),
			filterCfg: &TestTraceStateCfg{Key: "example", Values: []string{"value"}},
			Decision:  NotSampled,
		},
		{
			Desc:      "matching trace_state on multiple key-values",
			Trace:     newTraceState("example=value,non_matching=value"),
			filterCfg: &TestTraceStateCfg{Key: "example", Values: []string{"value"}},
			Decision:  Sampled,
		},
		{
			Desc:      "nonmatching trace_state on multiple filter list",
			Trace:     newTraceState("example=non_matching"),
			filterCfg: &TestTraceStateCfg{Key: "example", Values: []string{"value1", "value2"}},
			Decision:  NotSampled,
		},
		{
			Desc:      "matching trace_state on multiple filter list",
			Trace:     newTraceState("example=value1"),
			filterCfg: &TestTraceStateCfg{Key: "example", Values: []string{"value1", "value2"}},
			Decision:  Sampled,
		},
	}

	for _, c := range cases {
		t.Run(c.Desc, func(t *testing.T) {
			filter := NewTraceStateFilter(zap.NewNop(), c.filterCfg.Key, c.filterCfg.Values)
			decision, err := filter.Evaluate(pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16}), c.Trace)
			assert.NoError(t, err)
			assert.Equal(t, decision, c.Decision)
		})
	}
}

func newTraceState(traceState string) *TraceData {
	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()
	ils := rs.ScopeSpans().AppendEmpty()
	span := ils.Spans().AppendEmpty()
	span.SetTraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})
	span.TraceState().FromRaw(traceState)
	return &TraceData{
		ReceivedBatches: traces,
	}
}
