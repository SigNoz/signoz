package telemetrystore

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestProfileFromContext(t *testing.T) {
	assert.Empty(t, ProfileFromContext(context.Background()))
	assert.Equal(t, "query_range", ProfileFromContext(NewContextWithProfile(context.Background(), "query_range")))
}
