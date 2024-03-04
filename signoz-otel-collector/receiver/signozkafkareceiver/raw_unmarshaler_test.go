// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewRawUnmarshaler(t *testing.T) {
	um := newRawLogsUnmarshaler()
	assert.Equal(t, "raw", um.Encoding())
}
