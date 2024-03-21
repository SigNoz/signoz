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

package testdata

import (
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

var (
	TestSpanStartTime      = time.Date(2020, 2, 11, 20, 26, 12, 321, time.UTC)
	TestSpanStartTimestamp = pcommon.NewTimestampFromTime(TestSpanStartTime)

	TestSpanEventTime      = time.Date(2020, 2, 11, 20, 26, 13, 123, time.UTC)
	TestSpanEventTimestamp = pcommon.NewTimestampFromTime(TestSpanEventTime)

	TestSpanEndTime      = time.Date(2020, 2, 11, 20, 26, 13, 789, time.UTC)
	TestSpanEndTimestamp = pcommon.NewTimestampFromTime(TestSpanEndTime)
)

func GenerateTracesOneEmptyResourceSpans() ptrace.Traces {
	td := ptrace.NewTraces()
	td.ResourceSpans().AppendEmpty()
	return td
}

func GenerateTracesNoLibraries() ptrace.Traces {
	td := GenerateTracesOneEmptyResourceSpans()
	rs0 := td.ResourceSpans().At(0)
	initResource1(rs0.Resource())
	return td
}

func GenerateTracesOneEmptyScope() ptrace.Traces {
	td := GenerateTracesNoLibraries()
	td.ResourceSpans().At(0).ScopeSpans().AppendEmpty()
	return td
}

func GenerateTracesOneSpanNoResource() ptrace.Traces {
	td := GenerateTracesOneEmptyResourceSpans()
	rs0 := td.ResourceSpans().At(0)
	fillSpanOne(rs0.ScopeSpans().AppendEmpty().Spans().AppendEmpty())
	return td
}

func GenerateTracesOneSpan() ptrace.Traces {
	td := GenerateTracesOneEmptyScope()
	rs0ils0 := td.ResourceSpans().At(0).ScopeSpans().At(0)
	fillSpanOne(rs0ils0.Spans().AppendEmpty())
	return td
}

func GenerateTracesTwoSpansSameResource() ptrace.Traces {
	td := GenerateTracesOneEmptyScope()
	rs0ils0 := td.ResourceSpans().At(0).ScopeSpans().At(0)
	fillSpanOne(rs0ils0.Spans().AppendEmpty())
	fillSpanTwo(rs0ils0.Spans().AppendEmpty())
	return td
}

func GenerateTracesTwoSpansSameResourceOneDifferent() ptrace.Traces {
	td := ptrace.NewTraces()
	rs0 := td.ResourceSpans().AppendEmpty()
	initResource1(rs0.Resource())
	rs0ils0 := rs0.ScopeSpans().AppendEmpty()
	fillSpanOne(rs0ils0.Spans().AppendEmpty())
	fillSpanTwo(rs0ils0.Spans().AppendEmpty())
	rs1 := td.ResourceSpans().AppendEmpty()
	initResource2(rs1.Resource())
	rs1ils0 := rs1.ScopeSpans().AppendEmpty()
	fillSpanThree(rs1ils0.Spans().AppendEmpty())
	return td
}

func GenerateTracesManySpansSameResource(spanCount int) ptrace.Traces {
	td := GenerateTracesOneEmptyScope()
	rs0ils0 := td.ResourceSpans().At(0).ScopeSpans().At(0)
	rs0ils0.Spans().EnsureCapacity(spanCount)
	for i := 0; i < spanCount; i++ {
		fillSpanOne(rs0ils0.Spans().AppendEmpty())
	}
	return td
}

func fillSpanOne(span ptrace.Span) {
	span.SetName("operationA")
	span.SetStartTimestamp(TestSpanStartTimestamp)
	span.SetEndTimestamp(TestSpanEndTimestamp)
	span.SetDroppedAttributesCount(1)
	evs := span.Events()
	ev0 := evs.AppendEmpty()
	ev0.SetTimestamp(TestSpanEventTimestamp)
	ev0.SetName("event-with-attr")
	initSpanEventAttributes(ev0.Attributes())
	ev0.SetDroppedAttributesCount(2)
	ev1 := evs.AppendEmpty()
	ev1.SetTimestamp(TestSpanEventTimestamp)
	ev1.SetName("event")
	ev1.SetDroppedAttributesCount(2)
	span.SetDroppedEventsCount(1)
	status := span.Status()
	status.SetCode(ptrace.StatusCodeError)
	status.SetMessage("status-cancelled")
}

func fillSpanTwo(span ptrace.Span) {
	span.SetName("operationB")
	span.SetStartTimestamp(TestSpanStartTimestamp)
	span.SetEndTimestamp(TestSpanEndTimestamp)
	link0 := span.Links().AppendEmpty()
	initSpanLinkAttributes(link0.Attributes())
	link0.SetDroppedAttributesCount(4)
	link1 := span.Links().AppendEmpty()
	link1.SetDroppedAttributesCount(4)
	span.SetDroppedLinksCount(3)
}

func fillSpanThree(span ptrace.Span) {
	span.SetName("operationC")
	span.SetStartTimestamp(TestSpanStartTimestamp)
	span.SetEndTimestamp(TestSpanEndTimestamp)
	initSpanAttributes(span.Attributes())
	span.SetDroppedAttributesCount(5)
}
