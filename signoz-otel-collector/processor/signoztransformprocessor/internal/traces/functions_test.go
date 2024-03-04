// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package traces

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspan"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspanevent"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs"
)

func Test_SpanFunctions(t *testing.T) {
	expected := ottlfuncs.StandardFuncs[ottlspan.TransformContext]()
	actual := SpanFunctions()
	require.Equal(t, len(expected), len(actual))
	for k := range actual {
		assert.Contains(t, expected, k)
	}
}

func Test_SpanEventFunctions(t *testing.T) {
	expected := ottlfuncs.StandardFuncs[ottlspanevent.TransformContext]()
	actual := SpanEventFunctions()
	require.Equal(t, len(expected), len(actual))
	for k := range actual {
		assert.Contains(t, expected, k)
	}
}
