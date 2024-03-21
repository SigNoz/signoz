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
	"math"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.uber.org/zap"
)

func TestNumericTagFilter(t *testing.T) {

	var empty = map[string]interface{}{}
	filter := NewNumericAttributeFilter(zap.NewNop(), "example", math.MinInt32, math.MaxInt32)

	resAttr := map[string]interface{}{}
	resAttr["example"] = 8

	cases := []struct {
		Desc     string
		Trace    *TraceData
		Decision Decision
	}{
		{
			Desc:     "nonmatching span attribute",
			Trace:    newTraceIntAttrs(empty, "non_matching", math.MinInt32),
			Decision: NotSampled,
		},
		{
			Desc:     "span attribute with lower limit",
			Trace:    newTraceIntAttrs(empty, "example", math.MinInt32),
			Decision: Sampled,
		},
		{
			Desc:     "span attribute with upper limit",
			Trace:    newTraceIntAttrs(empty, "example", math.MaxInt32),
			Decision: Sampled,
		},
		{
			Desc:     "span attribute below min limit",
			Trace:    newTraceIntAttrs(empty, "example", math.MinInt32-1),
			Decision: NotSampled,
		},
		{
			Desc:     "span attribute above max limit",
			Trace:    newTraceIntAttrs(empty, "example", math.MaxInt32+1),
			Decision: NotSampled,
		},
	}

	for _, c := range cases {
		t.Run(c.Desc, func(t *testing.T) {
			u, _ := uuid.NewRandom()
			decision, err := filter.Evaluate(pcommon.TraceID(u), c.Trace)
			assert.NoError(t, err)
			assert.Equal(t, decision, c.Decision)
		})
	}
}

func newTraceIntAttrs(nodeAttrs map[string]interface{}, spanAttrKey string, spanAttrValue int64) *TraceData {
	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()
	//nolint:errcheck
	rs.Resource().Attributes().FromRaw(nodeAttrs)
	ils := rs.ScopeSpans().AppendEmpty()
	span := ils.Spans().AppendEmpty()
	span.SetTraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})
	span.Attributes().PutInt(spanAttrKey, spanAttrValue)
	return &TraceData{
		ReceivedBatches: traces,
	}
}
