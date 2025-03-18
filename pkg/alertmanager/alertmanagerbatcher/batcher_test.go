package alertmanagerbatcher

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

func TestBatcherWithOneAlertAndDefaultConfigs(t *testing.T) {
	batcher := New(slog.New(slog.NewTextHandler(io.Discard, nil)), NewConfig())
	_ = batcher.Start(context.Background())

	batcher.Add(context.Background(), &alertmanagertypes.PostableAlert{Alert: alertmanagertypes.AlertModel{
		Labels: map[string]string{"alertname": "test"},
	}})

	alerts := <-batcher.C
	assert.Equal(t, 1, len(alerts))

	batcher.Stop(context.Background())
}

func TestBatcherWithBatchSize(t *testing.T) {
	batcher := New(slog.New(slog.NewTextHandler(io.Discard, nil)), Config{Size: 2, Capacity: 4})
	_ = batcher.Start(context.Background())

	var alerts alertmanagertypes.PostableAlerts
	for i := 0; i < 4; i++ {
		alerts = append(alerts, &alertmanagertypes.PostableAlert{Alert: alertmanagertypes.AlertModel{
			Labels: map[string]string{"alertname": "test"},
		}})
	}
	batcher.Add(context.Background(), alerts...)

	for i := 0; i < 2; i++ {
		alerts := <-batcher.C
		assert.Equal(t, 2, len(alerts))
	}

	batcher.Stop(context.Background())
}

func TestBatcherWithCClosed(t *testing.T) {
	batcher := New(slog.New(slog.NewTextHandler(io.Discard, nil)), Config{Size: 2, Capacity: 4})
	_ = batcher.Start(context.Background())

	var alerts alertmanagertypes.PostableAlerts
	for i := 0; i < 4; i++ {
		alerts = append(alerts, &alertmanagertypes.PostableAlert{Alert: alertmanagertypes.AlertModel{
			Labels: map[string]string{"alertname": "test"},
		}})
	}
	batcher.Add(context.Background(), alerts...)

	batcher.Stop(context.Background())

	for alerts := range batcher.C {
		assert.Equal(t, 2, len(alerts))
	}
}
