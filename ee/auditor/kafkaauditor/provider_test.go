package kafkaauditor

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/twmb/franz-go/pkg/kerr"
	"github.com/twmb/franz-go/pkg/kfake"
	"github.com/twmb/franz-go/pkg/kgo"
	"go.opentelemetry.io/collector/pdata/plog"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/version"
)

func newTestCluster(t *testing.T, topics ...string) *kfake.Cluster {
	t.Helper()

	cluster, err := kfake.NewCluster(kfake.NumBrokers(1), kfake.SeedTopics(1, topics...))
	require.NoError(t, err)
	t.Cleanup(cluster.Close)

	return cluster
}

func newTestProvider(t *testing.T, brokers []string, topic string, compression string) *provider {
	t.Helper()

	config := auditor.Config{
		Provider:      "kafka",
		BufferSize:    10,
		BatchSize:     5,
		FlushInterval: 50 * time.Millisecond,
		Kafka: auditor.KafkaConfig{
			Brokers:         brokers,
			Topic:           topic,
			ClientID:        "signoz-test",
			Compression:     compression,
			ShutdownTimeout: 30 * time.Second,
		},
	}

	auditor, err := newProvider(context.Background(), instrumentationtest.New().ToProviderSettings(), config, nil, version.Info)
	require.NoError(t, err)

	return auditor.(*provider)
}

func newTestEvent(resource coretypes.Resource, action coretypes.Verb, body string) audittypes.AuditEvent {
	return audittypes.AuditEvent{
		Timestamp: time.Now(),
		Body:      body,
		EventName: audittypes.NewEventName(resource.Kind(), action),
		AuditAttributes: audittypes.AuditAttributes{
			Action:  action,
			Outcome: audittypes.OutcomeSuccess,
		},
		ResourceAttributes: audittypes.ResourceAttributes{
			Resource: resource,
		},
	}
}

// Polls the topic until the consumed records hold wantLogRecords audit log records in total.
func consumeRecords(t *testing.T, brokers []string, topic string, wantLogRecords int) []*kgo.Record {
	t.Helper()

	client, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.ConsumeTopics(topic),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
	)
	require.NoError(t, err)
	defer client.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var records []*kgo.Record
	gotLogRecords := 0
	for gotLogRecords < wantLogRecords {
		fetches := client.PollFetches(ctx)
		require.NoError(t, ctx.Err(), "timed out waiting for %d log records, got %d", wantLogRecords, gotLogRecords)
		require.Empty(t, fetches.Errors())

		for _, record := range fetches.Records() {
			logs, err := (&plog.ProtoUnmarshaler{}).UnmarshalLogs(record.Value)
			require.NoError(t, err)
			gotLogRecords += logs.LogRecordCount()
			records = append(records, record)
		}
	}

	return records
}

func TestExport(t *testing.T) {
	testCases := []struct {
		name            string
		compression     string
		compressionType uint8
	}{
		{name: "CompressionNone", compression: "none", compressionType: 0},
		{name: "CompressionGzip", compression: "gzip", compressionType: 1},
		{name: "CompressionSnappy", compression: "snappy", compressionType: 2},
		{name: "CompressionLz4", compression: "lz4", compressionType: 3},
		{name: "CompressionZstd", compression: "zstd", compressionType: 4},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			cluster := newTestCluster(t, "tenant_audit")
			provider := newTestProvider(t, cluster.ListenAddrs(), "tenant_audit", testCase.compression)
			defer provider.client.Close()

			events := []audittypes.AuditEvent{
				newTestEvent(coretypes.ResourceUser, coretypes.VerbUpdate, "user updated"),
				newTestEvent(coretypes.ResourceMetaResourceDashboard, coretypes.VerbCreate, "dashboard created"),
				newTestEvent(coretypes.ResourceMetaResourceDashboard, coretypes.VerbDelete, "dashboard deleted"),
			}
			require.NoError(t, provider.export(context.Background(), events))

			records := consumeRecords(t, cluster.ListenAddrs(), "tenant_audit", len(events))
			require.Len(t, records, 1)
			assert.Equal(t, "tenant_audit", records[0].Topic)
			assert.Equal(t, testCase.compressionType, records[0].Attrs.CompressionType())

			logs, err := (&plog.ProtoUnmarshaler{}).UnmarshalLogs(records[0].Value)
			require.NoError(t, err)
			assert.Equal(t, len(events), logs.LogRecordCount())

			serviceName, ok := logs.ResourceLogs().At(0).Resource().Attributes().Get("service.name")
			require.True(t, ok)
			assert.Equal(t, "signoz", serviceName.Str())
		})
	}
}

func TestExport_RecordTooLarge(t *testing.T) {
	cluster := newTestCluster(t, "large_audit")
	provider := newTestProvider(t, cluster.ListenAddrs(), "large_audit", "none")
	defer provider.client.Close()

	event := newTestEvent(coretypes.ResourceUser, coretypes.VerbCreate, strings.Repeat("a", 2<<20))

	err := provider.export(context.Background(), []audittypes.AuditEvent{event})
	require.Error(t, err)
	assert.True(t, errors.Is(err, kerr.MessageTooLarge))
}

func TestExport_UnknownTopic(t *testing.T) {
	cluster := newTestCluster(t)
	provider := newTestProvider(t, cluster.ListenAddrs(), "missing_audit", "lz4")
	defer provider.client.Close()

	err := provider.export(context.Background(), []audittypes.AuditEvent{newTestEvent(coretypes.ResourceUser, coretypes.VerbCreate, "user created")})
	require.Error(t, err)
	assert.True(t, errors.Is(err, kerr.UnknownTopicOrPartition))
}

func TestExport_BrokerDown_RetriesUntilContextDone(t *testing.T) {
	cluster := newTestCluster(t, "down_audit")
	brokers := cluster.ListenAddrs()
	cluster.Close()

	provider := newTestProvider(t, brokers, "down_audit", "lz4")
	defer provider.client.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	start := time.Now()
	err := provider.export(ctx, []audittypes.AuditEvent{newTestEvent(coretypes.ResourceUser, coretypes.VerbCreate, "user created")})
	require.Error(t, err)
	assert.True(t, errors.Is(err, context.DeadlineExceeded))
	assert.GreaterOrEqual(t, time.Since(start), 500*time.Millisecond)
}

func TestStop_DrainsQueuedEvents(t *testing.T) {
	cluster := newTestCluster(t, "drain_audit")
	provider := newTestProvider(t, cluster.ListenAddrs(), "drain_audit", "lz4")

	done := make(chan error, 1)
	go func() { done <- provider.Start(context.Background()) }()
	<-provider.Healthy()

	for range 7 {
		provider.server.Add(context.Background(), newTestEvent(coretypes.ResourceUser, coretypes.VerbUpdate, "user updated"))
	}

	require.NoError(t, provider.Stop(context.Background()))
	require.NoError(t, <-done)

	records := consumeRecords(t, cluster.ListenAddrs(), "drain_audit", 7)
	assert.NotEmpty(t, records)
}

func TestStop_BrokerDown_ClosesAfterShutdownTimeout(t *testing.T) {
	cluster := newTestCluster(t, "stuck_audit")
	brokers := cluster.ListenAddrs()
	cluster.Close()

	provider := newTestProvider(t, brokers, "stuck_audit", "lz4")
	provider.config.Kafka.ShutdownTimeout = 500 * time.Millisecond

	done := make(chan error, 1)
	go func() { done <- provider.Start(context.Background()) }()
	<-provider.Healthy()

	for range 7 {
		provider.server.Add(context.Background(), newTestEvent(coretypes.ResourceUser, coretypes.VerbUpdate, "user updated"))
	}

	start := time.Now()
	require.NoError(t, provider.Stop(context.Background()))
	require.NoError(t, <-done)
	assert.GreaterOrEqual(t, time.Since(start), 500*time.Millisecond)
	assert.Less(t, time.Since(start), 5*time.Second)
}
