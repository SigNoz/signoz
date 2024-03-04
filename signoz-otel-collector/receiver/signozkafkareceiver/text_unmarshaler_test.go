// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTextUnmarshaler(t *testing.T) {
	t.Parallel()
	um := newTextLogsUnmarshaler()
	assert.Equal(t, "text", um.Encoding())
}

func TestTextUnmarshalerWithEnc(t *testing.T) {
	t.Parallel()
	um := newTextLogsUnmarshaler()
	um2 := um
	assert.EqualValues(t, um, um2)

	um, err := um.WithEnc("utf8")
	require.NoError(t, err)
	um2, err = um2.WithEnc("gbk")
	require.NoError(t, err)
	assert.NotEqualValues(t, um, um2)

	um2, err = um2.WithEnc("utf8")
	require.NoError(t, err)
	assert.EqualValues(t, um, um2)
}
