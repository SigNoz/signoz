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
	"time"

	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.uber.org/zap"
)

func TestEvaluate_Latency(t *testing.T) {
	filter := NewLatency(zap.NewNop(), 5000)

	traceID := pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	now := time.Now()

	cases := []struct {
		Desc     string
		Spans    []spanWithTimeAndDuration
		Decision Decision
	}{
		{
			"trace duration shorter than threshold",
			[]spanWithTimeAndDuration{
				{
					StartTime: now,
					Duration:  4500 * time.Millisecond,
				},
			},
			NotSampled,
		},
		{
			"trace duration is equal to threshold",
			[]spanWithTimeAndDuration{
				{
					StartTime: now,
					Duration:  5000 * time.Millisecond,
				},
			},
			Sampled,
		},
		{
			"total trace duration is longer than threshold but every single span is shorter",
			[]spanWithTimeAndDuration{
				{
					StartTime: now,
					Duration:  3000 * time.Millisecond,
				},
				{
					StartTime: now.Add(2500 * time.Millisecond),
					Duration:  3000 * time.Millisecond,
				},
			},
			Sampled,
		},
	}

	for _, c := range cases {
		t.Run(c.Desc, func(t *testing.T) {
			decision, err := filter.Evaluate(traceID, newTraceWithSpans(c.Spans))

			assert.NoError(t, err)
			assert.Equal(t, decision, c.Decision)
		})
	}
}

type spanWithTimeAndDuration struct {
	StartTime time.Time
	Duration  time.Duration
}

func newTraceWithSpans(spans []spanWithTimeAndDuration) *TraceData {
	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()
	ils := rs.ScopeSpans().AppendEmpty()

	for _, s := range spans {
		span := ils.Spans().AppendEmpty()
		span.SetTraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
		span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})
		span.SetStartTimestamp(pcommon.NewTimestampFromTime(s.StartTime))
		span.SetEndTimestamp(pcommon.NewTimestampFromTime(s.StartTime.Add(s.Duration)))
	}

	return &TraceData{
		ReceivedBatches: traces,
	}
}
