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

package sampling // import "github.com/SigNoz/signoz-otel-collector/processor/internal/sampling"

import (
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

// hasResourceOrSpanWithCondition iterates through all the resources and instrumentation library spans until any
// callback returns true.
func hasResourceOrSpanWithCondition(
	td ptrace.Traces,
	shouldSampleResource func(resource pcommon.Resource) bool,
	shouldSampleSpan func(span ptrace.Span) bool,
) Decision {
	for i := 0; i < td.ResourceSpans().Len(); i++ {
		rs := td.ResourceSpans().At(i)

		resource := rs.Resource()
		if shouldSampleResource(resource) {
			return Sampled
		}

		if hasInstrumentationLibrarySpanWithCondition(rs.ScopeSpans(), shouldSampleSpan) {
			return Sampled
		}
	}
	return NotSampled
}

// invertHasResourceOrSpanWithCondition iterates through all the resources and instrumentation library spans until any
// callback returns false.
func invertHasResourceOrSpanWithCondition(
	td ptrace.Traces,
	shouldSampleResource func(resource pcommon.Resource) bool,
	shouldSampleSpan func(span ptrace.Span) bool,
) Decision {
	for i := 0; i < td.ResourceSpans().Len(); i++ {
		rs := td.ResourceSpans().At(i)

		resource := rs.Resource()
		if !shouldSampleResource(resource) {
			return InvertNotSampled
		}

		if !invertHasInstrumentationLibrarySpanWithCondition(rs.ScopeSpans(), shouldSampleSpan) {
			return InvertNotSampled
		}
	}
	return InvertSampled
}

// hasSpanWithCondition iterates through all the instrumentation library spans until any callback returns true.
func hasSpanWithCondition(td ptrace.Traces, shouldSample func(span ptrace.Span) bool) Decision {
	for i := 0; i < td.ResourceSpans().Len(); i++ {
		rs := td.ResourceSpans().At(i)

		if hasInstrumentationLibrarySpanWithCondition(rs.ScopeSpans(), shouldSample) {
			return Sampled
		}
	}
	return NotSampled
}

func hasInstrumentationLibrarySpanWithCondition(ilss ptrace.ScopeSpansSlice, check func(span ptrace.Span) bool) bool {
	for i := 0; i < ilss.Len(); i++ {
		ils := ilss.At(i)

		for j := 0; j < ils.Spans().Len(); j++ {
			span := ils.Spans().At(j)

			if check(span) {
				return true
			}
		}
	}
	return false
}

func invertHasInstrumentationLibrarySpanWithCondition(ilss ptrace.ScopeSpansSlice, check func(span ptrace.Span) bool) bool {
	for i := 0; i < ilss.Len(); i++ {
		ils := ilss.At(i)

		for j := 0; j < ils.Spans().Len(); j++ {
			span := ils.Spans().At(j)

			if !check(span) {
				return false
			}
		}
	}
	return true
}
