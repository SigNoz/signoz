// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package testdata

import "go.opentelemetry.io/collector/pdata/pcommon"

func initResource1(r pcommon.Resource) {
	r.Attributes().PutStr("resource-attr", "resource-attr-val-1")
}

func initResource2(r pcommon.Resource) {
	r.Attributes().PutStr("resource-attr", "resource-attr-val-2")
}
