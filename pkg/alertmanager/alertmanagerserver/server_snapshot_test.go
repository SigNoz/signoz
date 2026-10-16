package alertmanagerserver

import (
	"context"
	"log/slog"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes/alertmanagertypestest"
	"github.com/prometheus/alertmanager/nflog"
	"github.com/prometheus/alertmanager/nflog/nflogpb"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/require"
)

type snapshotResolvedSender struct{}

func (snapshotResolvedSender) SendResolved() bool { return true }

type snapshotWriteResult struct {
	name alertmanagertypes.StateName
	err  error
}

type snapshotBarrierStore struct {
	alertmanagertypes.StateStore
	first     alertmanagertypes.StateName
	arrivals  atomic.Int32
	gets      atomic.Int32
	ready     chan struct{}
	firstDone chan struct{}
	completed chan snapshotWriteResult
}

func (s *snapshotBarrierStore) Get(ctx context.Context, orgID string) (*alertmanagertypes.StoreableState, error) {
	s.gets.Add(1)
	return s.StateStore.Get(ctx, orgID)
}

func (s *snapshotBarrierStore) Set(ctx context.Context, state *alertmanagertypes.StoreableState, name alertmanagertypes.StateName) error {
	if s.arrivals.Add(1) == 2 {
		close(s.ready)
	}
	select {
	case <-s.ready:
	case <-ctx.Done():
		return ctx.Err()
	}
	if name != s.first {
		select {
		case <-s.firstDone:
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	err := s.StateStore.Set(ctx, state, name)
	select {
	case s.completed <- snapshotWriteResult{name: name, err: err}:
	case <-ctx.Done():
		return ctx.Err()
	}
	if name == s.first {
		close(s.firstDone)
	}
	return err
}

func TestServerFinalSnapshotsPreserveNFLog(t *testing.T) {
	for _, first := range []alertmanagertypes.StateName{alertmanagertypes.SilenceStateName, alertmanagertypes.NFLogStateName} {
		t.Run(first.String()+"-first", func(t *testing.T) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			store := &snapshotBarrierStore{
				StateStore: alertmanagertypestest.NewStateStore(), first: first,
				ready: make(chan struct{}), firstDone: make(chan struct{}),
				completed: make(chan snapshotWriteResult, 2),
			}
			cfg := NewConfig()
			cfg.Silences.MaintenanceInterval, cfg.NFLog.MaintenanceInterval = time.Hour, time.Hour
			server, err := New(ctx, slog.New(slog.DiscardHandler), prometheus.NewRegistry(), cfg, "org", store, nil, nil)
			require.NoError(t, err)
			stopped := make(chan struct{})
			var stopErr error
			stop := sync.OnceFunc(func() {
				go func() {
					stopErr = server.Stop(context.Background())
					close(stopped)
				}()
			})
			t.Cleanup(func() {
				cancel()
				stop()
				select {
				case <-stopped:
					require.NoError(t, stopErr)
				case <-time.After(5 * time.Second):
					t.Error("server cleanup timed out")
				}
			})
			receiver := &nflogpb.Receiver{GroupName: "receiver", Integration: "webhook", Idx: 0}
			logger := slog.New(slog.DiscardHandler)
			alert := &types.Alert{Alert: model.Alert{Labels: model.LabelSet{"alertname": "snapshot-regression"}, StartsAt: time.Now()}}
			notifyCtx := notify.WithGroupKey(ctx, "group")
			notifyCtx = notify.WithRepeatInterval(notifyCtx, time.Hour)
			dedup := notify.NewDedupStage(snapshotResolvedSender{}, server.nflog, receiver)
			notifyCtx, pending, err := dedup.Exec(notifyCtx, logger, alert)
			require.NoError(t, err)
			require.Len(t, pending, 1)
			_, _, err = notify.NewSetNotifiesStage(server.nflog, receiver).Exec(notifyCtx, logger, pending...)
			require.NoError(t, err)
			expectedEntries, err := server.nflog.Query(nflog.QReceiver(receiver), nflog.QGroupKey("group"))
			require.NoError(t, err)
			require.Len(t, expectedEntries, 1)
			stop()
			select {
			case <-stopped:
			case <-ctx.Done():
				t.Fatal("final snapshots timed out")
			}
			require.Equal(t, int32(2), store.arrivals.Load())
			require.Equal(t, int32(1), store.gets.Load())
			require.Len(t, store.completed, 2)
			firstResult, secondResult := <-store.completed, <-store.completed
			require.Equal(t, first, firstResult.name)
			require.NotEqual(t, first, secondResult.name)
			require.NoError(t, firstResult.err)
			require.NoError(t, secondResult.err)
			state, err := store.StateStore.Get(ctx, "org")
			require.NoError(t, err)
			require.Empty(t, state.Silences)
			snapshot, err := state.Get(alertmanagertypes.NFLogStateName)
			require.NoError(t, err)
			restored, err := nflog.New(nflog.Options{SnapshotReader: strings.NewReader(snapshot), Retention: cfg.NFLog.Retention, Metrics: prometheus.NewRegistry()})
			require.NoError(t, err)
			entries, err := restored.Query(nflog.QReceiver(receiver), nflog.QGroupKey("group"))
			require.NoError(t, err)
			require.Len(t, entries, 1)
			require.Equal(t, expectedEntries[0].FiringAlerts, entries[0].FiringAlerts)
			require.Empty(t, entries[0].ResolvedAlerts)
			_, pending, err = notify.NewDedupStage(snapshotResolvedSender{}, restored, receiver).Exec(notifyCtx, logger, alert)
			require.NoError(t, err)
			require.Empty(t, pending)
		})
	}
}
