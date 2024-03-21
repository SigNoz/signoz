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
	"go.uber.org/atomic"
	"go.uber.org/zap"
)

func TestRateLimiter(t *testing.T) {
	trace := newTraceStringAttrs(nil, "example", "value")
	traceID := pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	rateLimiter := NewRateLimiting(zap.NewNop(), 3)

	// Trace span count greater than spans per second
	trace.SpanCount = atomic.NewInt64(10)
	decision, err := rateLimiter.Evaluate(traceID, trace)
	assert.Nil(t, err)
	assert.Equal(t, decision, NotSampled)

	// Trace span count equal to spans per second
	trace.SpanCount = atomic.NewInt64(3)
	decision, err = rateLimiter.Evaluate(traceID, trace)
	assert.Nil(t, err)
	assert.Equal(t, decision, NotSampled)

	// Trace span count less than spans per second
	trace.SpanCount = atomic.NewInt64(2)
	decision, err = rateLimiter.Evaluate(traceID, trace)
	assert.Nil(t, err)
	assert.Equal(t, decision, Sampled)

	// Trace span count less than spans per second
	trace.SpanCount = atomic.NewInt64(0)
	decision, err = rateLimiter.Evaluate(traceID, trace)
	assert.Nil(t, err)
	assert.Equal(t, decision, Sampled)
}
