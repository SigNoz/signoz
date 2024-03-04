// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDefaultTracesUnMarshaler(t *testing.T) {
	expectedEncodings := []string{
		"otlp_proto",
		"jaeger_proto",
		"jaeger_json",
		"zipkin_proto",
		"zipkin_json",
		"zipkin_thrift",
	}
	marshalers := defaultTracesUnmarshalers()
	assert.Equal(t, len(expectedEncodings), len(marshalers))
	for _, e := range expectedEncodings {
		t.Run(e, func(t *testing.T) {
			m, ok := marshalers[e]
			require.True(t, ok)
			assert.NotNil(t, m)
		})
	}
}

func TestDefaultMetricsUnMarshaler(t *testing.T) {
	expectedEncodings := []string{
		"otlp_proto",
	}
	marshalers := defaultMetricsUnmarshalers()
	assert.Equal(t, len(expectedEncodings), len(marshalers))
	for _, e := range expectedEncodings {
		t.Run(e, func(t *testing.T) {
			m, ok := marshalers[e]
			require.True(t, ok)
			assert.NotNil(t, m)
		})
	}
}

func TestDefaultLogsUnMarshaler(t *testing.T) {
	expectedEncodings := []string{
		"otlp_proto",
		"raw",
		"text",
	}
	marshalers := defaultLogsUnmarshalers()
	assert.Equal(t, len(expectedEncodings), len(marshalers))
	for _, e := range expectedEncodings {
		t.Run(e, func(t *testing.T) {
			m, ok := marshalers[e]
			require.True(t, ok)
			assert.NotNil(t, m)
		})
	}
}
