// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package logs

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottllog"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs"
)

func Test_LogFunctions(t *testing.T) {
	expected := ottlfuncs.StandardFuncs[ottllog.TransformContext]()
	for name, factory := range SignozLogFunctions() {
		expected[name] = factory
	}

	actual := LogFunctions()
	require.Equal(t, len(expected), len(actual))
	for k := range actual {
		assert.Contains(t, expected, k)
	}
}
