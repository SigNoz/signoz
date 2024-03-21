// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

func TestNewPdataTracesUnmarshaler(t *testing.T) {
	um := newPdataTracesUnmarshaler(&ptrace.ProtoUnmarshaler{}, "test")
	assert.Equal(t, "test", um.Encoding())
}

func TestNewPdataMetricsUnmarshaler(t *testing.T) {
	um := newPdataMetricsUnmarshaler(&pmetric.ProtoUnmarshaler{}, "test")
	assert.Equal(t, "test", um.Encoding())
}

func TestNewPdataLogsUnmarshaler(t *testing.T) {
	um := newPdataLogsUnmarshaler(&plog.ProtoUnmarshaler{}, "test")
	assert.Equal(t, "test", um.Encoding())
}
