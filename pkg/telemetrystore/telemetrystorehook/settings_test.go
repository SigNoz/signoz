package telemetrystorehook

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/stretchr/testify/assert"
)

func TestSettingsForContextReadOnly(t *testing.T) {
	hook := &provider{settings: telemetrystore.QuerySettings{}}

	normalSettings := hook.settingsForContext(context.Background())
	_, ok := normalSettings["readonly"]
	assert.False(t, ok)

	readOnlySettings := hook.settingsForContext(ctxtypes.SetClickhouseReadOnly(context.Background()))
	assert.Equal(t, 2, readOnlySettings["readonly"])
}
