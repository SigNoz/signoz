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
	"go.opentelemetry.io/collector/pdata/pcommon"
)

var (
	resourceAttributes1 = map[string]interface{}{"resource-attr": pcommon.NewValueStr("resource-attr-val-1")}
	resourceAttributes2 = map[string]interface{}{"resource-attr": pcommon.NewValueStr("resource-attr-val-2")}
	spanEventAttributes = map[string]interface{}{"span-event-attr": pcommon.NewValueStr("span-event-attr-val")}
	spanLinkAttributes  = map[string]interface{}{"span-link-attr": pcommon.NewValueStr("span-link-attr-val")}
	spanAttributes      = map[string]interface{}{"span-attr": pcommon.NewValueStr("span-attr-val")}
)

const (
	TestLabelKey1       = "label-1"
	TestLabelValue1     = "label-value-1"
	TestLabelKey2       = "label-2"
	TestLabelValue2     = "label-value-2"
	TestLabelKey3       = "label-3"
	TestLabelValue3     = "label-value-3"
	TestAttachmentKey   = "exemplar-attachment"
	TestAttachmentValue = "exemplar-attachment-value"
)

func initResourceAttributes1(dest pcommon.Map) {
	t := pcommon.NewMap()
	t.FromRaw(resourceAttributes1)
	t.CopyTo(dest)
}

func initResourceAttributes2(dest pcommon.Map) {
	t := pcommon.NewMap()
	t.FromRaw(resourceAttributes2)
	t.CopyTo(dest)
}

func initSpanAttributes(dest pcommon.Map) {
	t := pcommon.NewMap()
	t.FromRaw(spanAttributes)
	t.CopyTo(dest)
}

func initSpanEventAttributes(dest pcommon.Map) {
	t := pcommon.NewMap()
	t.FromRaw(spanEventAttributes)
	t.CopyTo(dest)
}

func initSpanLinkAttributes(dest pcommon.Map) {
	t := pcommon.NewMap()
	t.FromRaw(spanLinkAttributes)
	t.CopyTo(dest)
}

func initMetricAttachment(dest pcommon.Map) {
	dest.PutStr(TestAttachmentKey, TestAttachmentValue)
}

func initMetricAttributes1(dest pcommon.Map) {
	dest.PutStr(TestLabelKey1, TestLabelValue1)
}

func initMetricAttributes12(dest pcommon.Map) {
	dest.PutStr(TestLabelKey1, TestLabelValue1)
	dest.PutStr(TestLabelKey2, TestLabelValue2)
}

func initMetricAttributes13(dest pcommon.Map) {
	dest.PutStr(TestLabelKey1, TestLabelValue1)
	dest.PutStr(TestLabelKey3, TestLabelValue3)
}

func initMetricAttributes2(dest pcommon.Map) {
	dest.PutStr(TestLabelKey2, TestLabelValue2)
}
