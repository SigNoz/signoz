package noopauditor

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var _ auditor.Auditor = (*provider)(nil)

func newTestProvider(t *testing.T) auditor.Auditor {
	t.Helper()
	settings := instrumentationtest.New().ToProviderSettings()
	p, err := New(context.Background(), settings, auditor.Config{})
	require.NoError(t, err)
	return p
}

func TestNew(t *testing.T) {
	p := newTestProvider(t)
	assert.NotNil(t, p)
}

func TestAuditZeroValue(t *testing.T) {
	p := newTestProvider(t)
	assert.NotPanics(t, func() {
		p.Audit(context.Background(), audittypes.AuditEvent{})
	})
}

func TestAuditPopulatedEvent(t *testing.T) {
	p := newTestProvider(t)
	assert.NotPanics(t, func() {
		p.Audit(context.Background(), audittypes.AuditEvent{
			Timestamp:    time.Now(),
			EventName:    audittypes.NewEventName("dashboard", audittypes.ActionCreate),
			ResourceName: "dashboard",
			Action:       audittypes.ActionCreate,
			Outcome:      audittypes.OutcomeSuccess,
		})
	})
}

func TestStartStop(t *testing.T) {
	p := newTestProvider(t)

	startErrC := make(chan error, 1)
	go func() {
		startErrC <- p.Start(context.Background())
	}()

	select {
	case <-p.Healthy():
	case <-time.After(time.Second):
		t.Fatal("Healthy channel not closed within timeout")
	}

	assert.NoError(t, p.Stop(context.Background()))

	select {
	case err := <-startErrC:
		assert.NoError(t, err)
	case <-time.After(time.Second):
		t.Fatal("Start did not return after Stop")
	}
}

func TestNewFactory(t *testing.T) {
	f := NewFactory()
	assert.Equal(t, factory.MustNewName("noop"), f.Name())
}
