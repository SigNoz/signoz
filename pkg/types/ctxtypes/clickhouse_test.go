package ctxtypes

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestClickhouseReadOnlyContext(t *testing.T) {
	ctx := context.Background()
	assert.False(t, IsClickhouseReadOnly(ctx))

	ctx = SetClickhouseReadOnly(ctx)
	assert.True(t, IsClickhouseReadOnly(ctx))
}
