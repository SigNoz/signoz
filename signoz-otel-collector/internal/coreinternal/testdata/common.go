// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package testdata

import "go.opentelemetry.io/collector/pdata/pcommon"

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
