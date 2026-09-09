package alertmanager

import (
	"context"
	"log/slog"
	"net"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/go-openapi/strfmt"
	amconfig "github.com/prometheus/alertmanager/config"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerserver"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfmanagertest"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

const serviceSMTPWait = 5 * time.Second

func TestServiceTestReceiverSMTPContextCancellation(t *testing.T) {
	for _, tc := range []struct {
		name     string
		deadline bool
	}{
		{name: "cancel_without_deadline"},
		{name: "deadline_after_connection", deadline: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			testServiceSMTPContextCancellation(t, tc.deadline, func(ctx context.Context, service *Service, orgID string, receiver *alertmanagertypes.Receiver) error {
				return service.TestReceiver(ctx, orgID, receiver)
			})
		})
	}
}

func TestServiceTestAlertSMTPContextCancellation(t *testing.T) {
	testServiceSMTPContextCancellation(t, false, func(ctx context.Context, service *Service, orgID string, receiver *alertmanagertypes.Receiver) error {
		alert := &alertmanagertypes.PostableAlert{
			Alert: alertmanagertypes.AlertModel{
				Labels: map[string]string{"alertname": "smtp-test", "ruleId": "smtp-rule"},
			},
		}
		notifyConfig := alertmanagertypes.GetDefaultNotificationConfig()
		return service.TestAlert(ctx, orgID, map[*alertmanagertypes.PostableAlert][]string{alert: {receiver.Name}}, &notifyConfig)
	})
}

func testServiceSMTPContextCancellation(t *testing.T, deadline bool, notify func(context.Context, *Service, string, *alertmanagertypes.Receiver) error) {
	t.Helper()

	peer := newServiceSMTPPeer(t)
	host, port, err := net.SplitHostPort(peer.listener.Addr().String())
	require.NoError(t, err)
	config := alertmanagerserver.NewConfig()
	config.Templates = nil
	config.Global.SMTPSmarthost = amconfig.HostPort{Host: host, Port: port}
	config.Global.SMTPRequireTLS = false
	config.Global.SMTPFrom = "alerts@example.test"

	receiver, err := alertmanagertypes.NewReceiver(`{"name":"smtp-receiver","email_configs":[{"to":"recipient@example.test"}]}`)
	require.NoError(t, err)
	orgs := []*types.Organization{
		types.NewOrganization("SMTP organization", "smtp-org"),
		types.NewOrganization("Other organization", "other-org"),
	}
	smtpOrgID := orgs[0].ID.StringValue()
	otherOrgID := orgs[1].ID.StringValue()
	channel, err := alertmanagertypes.NewChannelFromReceiver(receiver, smtpOrgID)
	require.NoError(t, err)
	configStore := &serviceSMTPConfigStore{
		configs:  make(map[string]alertmanagertypes.StoreableConfig),
		channels: map[string][]*alertmanagertypes.Channel{smtpOrgID: {channel}},
	}
	for _, org := range orgs {
		orgID := org.ID.StringValue()
		stored, err := alertmanagertypes.NewConfigFromChannels(config.Global, config.Route, configStore.channels[orgID], orgID)
		require.NoError(t, err)
		require.NoError(t, configStore.Set(context.Background(), stored))
	}

	settings := factorytest.NewSettings()
	settings.Logger = slog.New(slog.DiscardHandler)
	registry := prometheus.NewRegistry()
	settings.PrometheusRegisterer = registry
	getter := &serviceSMTPOrgGetter{orgs: orgs}
	service := New(
		factory.NewScopedProviderSettings(settings, "alertmanager-smtp-test"),
		config,
		&serviceSMTPStateStore{states: make(map[string]alertmanagertypes.StoreableState)},
		configStore,
		getter,
		nfmanagertest.NewMock(),
		nil,
	)
	var operations []*serviceSMTPOperation
	t.Cleanup(func() {
		watchdog := time.AfterFunc(serviceSMTPWait, func() {
			panic("SMTP service test cleanup timed out joining operations or stopping servers")
		})
		defer watchdog.Stop()
		peer.close()
		for _, operation := range operations {
			<-operation.done
		}
		require.NoError(t, service.Stop(context.Background()))
	})
	start := func(name string, fn func() error) *serviceSMTPOperation {
		operation := newServiceSMTPOperation(name, fn)
		operations = append(operations, operation)
		return operation
	}
	require.NoError(t, start("initial SyncServers", func() error {
		return service.SyncServers(context.Background())
	}).wait(t))
	require.Len(t, service.servers, len(orgs))
	for _, org := range orgs {
		server := service.servers[org.ID.StringValue()]
		require.NotNil(t, server)
		require.NotEmpty(t, server.Hash())
	}
	waitServiceSMTPWorkers(t, service, registry, orgs)
	params, err := alertmanagertypes.NewGettableAlertsParams(httptest.NewRequest("GET", "/alerts", nil))
	require.NoError(t, err)

	// SyncServers reinitializes global matchers before calling the getter; order that before notification parsing.
	getter.listed = make(chan struct{})
	getter.proceed = make(chan struct{})
	releaseSync := sync.OnceFunc(func() { close(getter.proceed) })
	t.Cleanup(releaseSync)
	syncServers := start("pending SyncServers", func() error {
		return service.SyncServers(context.Background())
	})
	select {
	case <-getter.listed:
	case <-time.After(serviceSMTPWait):
		t.Fatal("SyncServers did not reach organization lookup")
	}

	var ctx context.Context
	var cancel context.CancelFunc
	if deadline {
		ctx, cancel = context.WithTimeout(context.Background(), time.Second)
	} else {
		ctx, cancel = context.WithCancel(context.Background())
	}
	t.Cleanup(cancel)
	_, hasDeadline := ctx.Deadline()
	require.Equal(t, deadline, hasDeadline)
	notification := start("SMTP notification", func() error {
		return notify(ctx, service, smtpOrgID, receiver)
	})
	select {
	case err := <-peer.accepted:
		require.NoError(t, err)
	case <-notification.done:
		t.Fatalf("notification returned before SMTP accept: %v", notification.wait(t))
	case <-time.After(serviceSMTPWait):
		t.Fatal("SMTP peer did not accept a connection")
	}
	require.NoError(t, ctx.Err(), "context must still be live after connection")
	notification.requirePending(t)
	releaseSync()
	// A pending writer rejects new readers while the stalled notification holds its read lock.
	require.Eventually(t, func() bool {
		if service.serversMtx.TryRLock() {
			service.serversMtx.RUnlock()
			return false
		}
		return true
	}, serviceSMTPWait, time.Millisecond)

	getAlerts := start("other organization GetAlerts", func() error {
		alerts, err := service.GetAlerts(context.Background(), otherOrgID, params)
		if err == nil && len(alerts) != 0 {
			return errors.NewInternalf(errors.CodeInternal, "expected no active alerts, got %d", len(alerts))
		}
		return err
	})
	putAlerts := start("other organization PutAlerts", func() error {
		return service.PutAlerts(context.Background(), otherOrgID, alertmanagertypes.PostableAlerts{})
	})
	for _, operation := range []*serviceSMTPOperation{syncServers, getAlerts, putAlerts} {
		select {
		case <-operation.started:
		case <-time.After(serviceSMTPWait):
			t.Fatalf("%s did not start", operation.name)
		}
		operation.requirePending(t)
	}
	require.NoError(t, ctx.Err(), "cross-organization requests must start before cancellation")
	if deadline {
		select {
		case <-ctx.Done():
		case <-time.After(serviceSMTPWait):
			t.Fatal("SMTP context deadline did not expire")
		}
		require.ErrorIs(t, ctx.Err(), context.DeadlineExceeded)
	} else {
		cancel()
		require.ErrorIs(t, ctx.Err(), context.Canceled)
	}

	require.Error(t, notification.wait(t))
	require.NoError(t, syncServers.wait(t))
	require.NoError(t, getAlerts.wait(t))
	require.NoError(t, putAlerts.wait(t))
	select {
	case <-peer.done:
		t.Fatal("SMTP peer was closed before recovery")
	default:
	}
}

func waitServiceSMTPWorkers(t *testing.T, service *Service, registry *prometheus.Registry, orgs []*types.Organization) {
	t.Helper()

	// Subscriber counters prove both workers started; expired, unrouted probes never reach maintenance lookup or delivery.
	now := time.Now()
	probe := alertmanagertypes.PostableAlerts{{
		Alert:    alertmanagertypes.AlertModel{Labels: map[string]string{"alertname": "smtp-startup", "ruleId": "smtp-startup"}},
		StartsAt: strfmt.DateTime(now.Add(-2 * time.Hour)),
		EndsAt:   strfmt.DateTime(now.Add(-time.Hour)),
	}}
	ticker := time.NewTicker(time.Millisecond)
	defer ticker.Stop()
	timeout := time.NewTimer(serviceSMTPWait)
	defer timeout.Stop()
	for {
		for _, org := range orgs {
			require.NoError(t, service.PutAlerts(context.Background(), org.ID.StringValue(), probe))
		}
		metrics, err := registry.Gather()
		require.NoError(t, err)
		ready := make(map[string]map[string]bool)
		for _, family := range metrics {
			if family.GetName() != "signoz_alertmanager_alerts_subscriber_channel_writes_total" {
				continue
			}
			for _, metric := range family.GetMetric() {
				var orgID, subscriber string
				for _, label := range metric.GetLabel() {
					switch label.GetName() {
					case "org_id":
						orgID = label.GetValue()
					case "subscriber":
						subscriber = label.GetValue()
					}
				}
				if metric.GetCounter().GetValue() > 0 {
					if ready[orgID] == nil {
						ready[orgID] = make(map[string]bool)
					}
					ready[orgID][subscriber] = true
				}
			}
		}
		allReady := true
		for _, org := range orgs {
			orgID := org.ID.StringValue()
			allReady = allReady && ready[orgID]["dispatcher-"+orgID] && ready[orgID]["inhibitor"]
		}
		if allReady {
			return
		}
		select {
		case <-ticker.C:
		case <-timeout.C:
			t.Fatal("alertmanager workers did not subscribe")
		}
	}
}

type serviceSMTPOperation struct {
	name    string
	started chan struct{}
	done    chan struct{}
	result  chan error
}

func newServiceSMTPOperation(name string, fn func() error) *serviceSMTPOperation {
	operation := &serviceSMTPOperation{
		name:    name,
		started: make(chan struct{}),
		done:    make(chan struct{}),
		result:  make(chan error, 1),
	}
	go func() {
		defer close(operation.done)
		close(operation.started)
		operation.result <- fn()
	}()
	return operation
}

func (operation *serviceSMTPOperation) wait(t *testing.T) error {
	t.Helper()
	select {
	case <-operation.done:
		return <-operation.result
	case <-time.After(serviceSMTPWait):
		t.Fatalf("%s did not return", operation.name)
		return nil
	}
}

func (operation *serviceSMTPOperation) requirePending(t *testing.T) {
	t.Helper()
	select {
	case <-operation.done:
		t.Fatalf("%s returned before context cancellation: %v", operation.name, <-operation.result)
	default:
	}
}

type serviceSMTPPeer struct {
	listener net.Listener
	accepted chan error
	stop     chan struct{}
	done     chan struct{}
	once     sync.Once
}

func newServiceSMTPPeer(t *testing.T) *serviceSMTPPeer {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	peer := &serviceSMTPPeer{
		listener: listener,
		accepted: make(chan error, 1),
		stop:     make(chan struct{}),
		done:     make(chan struct{}),
	}
	t.Cleanup(peer.close)
	go func() {
		defer close(peer.done)
		conn, err := listener.Accept()
		peer.accepted <- err
		if err != nil {
			return
		}
		defer conn.Close()
		<-peer.stop
	}()
	return peer
}

func (peer *serviceSMTPPeer) close() {
	peer.once.Do(func() {
		_ = peer.listener.Close()
		close(peer.stop)
	})
	<-peer.done
}

type serviceSMTPConfigStore struct {
	alertmanagertypes.ConfigStore
	mu       sync.Mutex
	configs  map[string]alertmanagertypes.StoreableConfig
	channels map[string][]*alertmanagertypes.Channel
}

func (store *serviceSMTPConfigStore) Get(_ context.Context, orgID string) (*alertmanagertypes.Config, error) {
	store.mu.Lock()
	stored, ok := store.configs[orgID]
	store.mu.Unlock()
	if !ok {
		return nil, errors.New(errors.TypeNotFound, alertmanagertypes.ErrCodeAlertmanagerConfigNotFound, "config not found")
	}
	return alertmanagertypes.NewConfigFromStoreableConfig(&stored)
}

func (store *serviceSMTPConfigStore) Set(_ context.Context, config *alertmanagertypes.Config, _ ...alertmanagertypes.StoreOption) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	stored := *config.StoreableConfig()
	store.configs[stored.OrgID] = stored
	return nil
}

func (store *serviceSMTPConfigStore) ListChannels(_ context.Context, orgID string) ([]*alertmanagertypes.Channel, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	channels := make([]*alertmanagertypes.Channel, 0, len(store.channels[orgID]))
	for _, channel := range store.channels[orgID] {
		clone := *channel
		channels = append(channels, &clone)
	}
	return channels, nil
}

func (*serviceSMTPConfigStore) GetMatchers(context.Context, string) (map[string][]string, error) {
	return map[string][]string{}, nil
}

type serviceSMTPStateStore struct {
	mu     sync.Mutex
	states map[string]alertmanagertypes.StoreableState
}

func (store *serviceSMTPStateStore) Get(_ context.Context, orgID string) (*alertmanagertypes.StoreableState, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	state, ok := store.states[orgID]
	if !ok {
		return alertmanagertypes.NewStoreableState(orgID), nil
	}
	return &state, nil
}

func (store *serviceSMTPStateStore) Set(_ context.Context, state *alertmanagertypes.StoreableState) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	store.states[state.OrgID] = *state
	return nil
}

type serviceSMTPOrgGetter struct {
	organization.Getter
	orgs    []*types.Organization
	listed  chan struct{}
	proceed chan struct{}
}

func (getter *serviceSMTPOrgGetter) ListByOwnedKeyRange(context.Context) ([]*types.Organization, error) {
	if getter.listed != nil {
		close(getter.listed)
		<-getter.proceed
	}
	return getter.orgs, nil
}
