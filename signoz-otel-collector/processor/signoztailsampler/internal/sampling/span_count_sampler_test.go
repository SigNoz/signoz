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
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.uber.org/atomic"
	"go.uber.org/zap"
)

func TestEvaluate_NumberSpans(t *testing.T) {
	filter := NewSpanCount(zap.NewNop(), 2)

	traceID := pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})

	cases := []struct {
		Desc        string
		NumberSpans []int32
		Decision    Decision
	}{
		{
			"Only one trace, less than the threshold",
			[]int32{
				1,
			},
			NotSampled,
		},
		{
			"Bigger amount of spans than the threshold, in one single batch",
			[]int32{
				3,
			},
			Sampled,
		},
		{
			"Bigger amount of spans than the threshold, with different span count per batch",
			[]int32{
				1, 2, 1,
			},
			Sampled,
		},
		{
			"Same number of spans as the threshold, in one single batch",
			[]int32{
				2,
			},
			Sampled,
		},
		{
			"Bigger amount of spans than the threshold, across multiple batches",
			[]int32{
				1, 1, 1,
			},
			Sampled,
		},
		{
			"Bigger amount of spans than the threshold, with a different number",
			[]int32{
				1, 3, 1,
			},
			Sampled,
		},
		{
			"Same number of spans as the threshold, across multiple batches",
			[]int32{
				1, 1,
			},
			Sampled,
		},
	}

	for _, c := range cases {
		t.Run(c.Desc, func(t *testing.T) {
			decision, err := filter.Evaluate(traceID, newTraceWithMultipleSpans(c.NumberSpans))

			assert.NoError(t, err)
			assert.Equal(t, decision, c.Decision)
		})
	}
}

func newTraceWithMultipleSpans(numberSpans []int32) *TraceData {
	var totalNumberSpans = int32(0)

	// For each resource, going to create the number of spans defined in the array
	traces := ptrace.NewTraces()
	for i := range numberSpans {
		// Creates trace
		rs := traces.ResourceSpans().AppendEmpty()
		ils := rs.ScopeSpans().AppendEmpty()

		for r := 0; r < int(numberSpans[i]); r++ {
			span := ils.Spans().AppendEmpty()
			span.SetTraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
			span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})
		}
		totalNumberSpans += numberSpans[i]
	}

	return &TraceData{
		ReceivedBatches: traces,
		SpanCount:       atomic.NewInt64(int64(totalNumberSpans)),
	}
}
