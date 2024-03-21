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
	"go.uber.org/zap"
)

func TestNewStatusCodeFilter_errorHandling(t *testing.T) {
	_, err := NewStatusCodeFilter(zap.NewNop(), []string{})
	assert.Error(t, err, "expected at least one status code to filter on")

	_, err = NewStatusCodeFilter(zap.NewNop(), []string{"OK", "ERR"})
	assert.EqualError(t, err, "unknown status code \"ERR\", supported: OK, ERROR, UNSET")
}

func TestStatusCodeSampling(t *testing.T) {
	traceID := pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})

	cases := []struct {
		Desc                  string
		StatusCodesToFilterOn []string
		StatusCodesPresent    []ptrace.StatusCode
		Decision              Decision
	}{
		{
			Desc:                  "filter on ERROR - none match",
			StatusCodesToFilterOn: []string{"ERROR"},
			StatusCodesPresent:    []ptrace.StatusCode{ptrace.StatusCodeOk, ptrace.StatusCodeUnset, ptrace.StatusCodeOk},
			Decision:              NotSampled,
		},
		{
			Desc:                  "filter on OK and ERROR - none match",
			StatusCodesToFilterOn: []string{"OK", "ERROR"},
			StatusCodesPresent:    []ptrace.StatusCode{ptrace.StatusCodeUnset, ptrace.StatusCodeUnset},
			Decision:              NotSampled,
		},
		{
			Desc:                  "filter on UNSET - matches",
			StatusCodesToFilterOn: []string{"UNSET"},
			StatusCodesPresent:    []ptrace.StatusCode{ptrace.StatusCodeUnset},
			Decision:              Sampled,
		},
		{
			Desc:                  "filter on OK and UNSET - matches",
			StatusCodesToFilterOn: []string{"OK", "UNSET"},
			StatusCodesPresent:    []ptrace.StatusCode{ptrace.StatusCodeError, ptrace.StatusCodeOk},
			Decision:              Sampled,
		},
	}

	for _, c := range cases {
		t.Run(c.Desc, func(t *testing.T) {
			traces := ptrace.NewTraces()
			rs := traces.ResourceSpans().AppendEmpty()
			ils := rs.ScopeSpans().AppendEmpty()

			for _, statusCode := range c.StatusCodesPresent {
				span := ils.Spans().AppendEmpty()
				span.Status().SetCode(statusCode)
				span.SetTraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
				span.SetSpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})
			}

			trace := &TraceData{
				ReceivedBatches: traces,
			}

			statusCodeFilter, err := NewStatusCodeFilter(zap.NewNop(), c.StatusCodesToFilterOn)
			assert.NoError(t, err)

			decision, err := statusCodeFilter.Evaluate(traceID, trace)
			assert.NoError(t, err)
			assert.Equal(t, c.Decision, decision)
		})
	}
}
