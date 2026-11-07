package queues

import (
	"strings"
	"testing"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

// TestNormalizeQueueSystem verifies that vendor-specific OpenTelemetry messaging.system
// aliases resolve to their canonical overview identifiers.
func TestNormalizeQueueSystem(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{input: "kafka", expected: QueueSystemKafka},
		{input: "celery", expected: QueueSystemCelery},
		{input: "aws_sqs", expected: QueueSystemAWSSQS},
		{input: "sqs", expected: QueueSystemAWSSQS},
		{input: "aws.sqs", expected: QueueSystemAWSSQS},
		{input: "AmazonSQS", expected: QueueSystemAWSSQS},
		{input: "gcp_pubsub", expected: QueueSystemGCPPubSub},
		{input: "pubsub", expected: QueueSystemGCPPubSub},
		{input: "googlecloudpubsub", expected: QueueSystemGCPPubSub},
		{input: "aws_kinesis", expected: QueueSystemAWSKinesis},
		{input: "kinesis", expected: QueueSystemAWSKinesis},
		{input: "aws.kinesis", expected: QueueSystemAWSKinesis},
		{input: "redis", expected: QueueSystemRedis},
		{input: "  REDIS  ", expected: QueueSystemRedis},
		{input: "", expected: ""},
	}

	for _, tc := range cases {
		actual := NormalizeQueueSystem(tc.input)
		if actual != tc.expected {
			t.Fatalf("NormalizeQueueSystem(%q) = %q, expected %q", tc.input, actual, tc.expected)
		}
	}
}

// TestNormalizeQueueSystemsDeduplication verifies that duplicate aliases for the same
// queue provider collapse into a single canonical entry in deterministic order.
func TestNormalizeQueueSystemsDeduplication(t *testing.T) {
	raw := []string{"sqs", "aws_sqs", "AmazonSQS", "pubsub", "gcp_pubsub", "kinesis", "redis"}
	actual := NormalizeQueueSystems(raw)
	expected := []string{
		QueueSystemAWSSQS,
		QueueSystemGCPPubSub,
		QueueSystemAWSKinesis,
		QueueSystemRedis,
	}

	if len(actual) != len(expected) {
		t.Fatalf("expected %d systems, got %d (%v)", len(expected), len(actual), actual)
	}
	for idx, system := range expected {
		if actual[idx] != system {
			t.Fatalf("at index %d: got %q, expected %q", idx, actual[idx], system)
		}
	}
}

// assertSQLContainsAll verifies that the compiled ClickHouse SQL string contains
// every required clause fragment.
func assertSQLContainsAll(t *testing.T, sql string, fragments []string) {
	t.Helper()
	for _, fragment := range fragments {
		if !strings.Contains(sql, fragment) {
			t.Fatalf("expected SQL to contain %q, got:\n%s", fragment, sql)
		}
	}
}

// TestBuildOverviewQueryMultiQueueSupport verifies that BuildOverviewQuery compiles
// ClickHouse SQL covering AWS SQS, Google Pub/Sub, AWS Kinesis, Redis, Kafka, and Celery.
func TestBuildOverviewQueryMultiQueueSupport(t *testing.T) {
	req := &QueueListRequest{
		Start: 1700000000000000000,
		End:   1700000300000000000,
		Filters: &v3.FilterSet{
			Operator: "AND",
			Items: []v3.FilterItem{
				{
					Key:      v3.AttributeKey{Key: "queue", DataType: v3.AttributeKeyDataTypeString},
					Operator: v3.FilterOperatorIn,
					Value:    []string{"sqs", "pubsub", "kinesis", "redis"},
				},
				{
					Key:      v3.AttributeKey{Key: "destination", DataType: v3.AttributeKeyDataTypeString},
					Operator: v3.FilterOperatorIn,
					Value:    []string{"orders-queue", "events-stream"},
				},
			},
		},
	}

	chq, err := BuildOverviewQuery(req)
	if err != nil {
		t.Fatalf("unexpected error building overview query: %v", err)
	}

	assertSQLContainsAll(t, chq.Query, []string{
		"THEN 'aws_sqs'",
		"THEN 'gcp_pubsub'",
		"THEN 'aws_kinesis'",
		"THEN 'redis'",
		"THEN 'celery'",
		"attributes_string['aws.sqs.queue.name']",
		"attributes_string['aws.kinesis.stream.name']",
		"attributes_string['db.redis.database_index']",
		"attribute_string_db$$system = 'redis'",
		"messaging_system IN (['aws_sqs','gcp_pubsub','aws_kinesis','redis'])",
		"destination IN (['orders-queue','events-stream'])",
	})
}

// TestQueueListRequestValidation verifies guard clauses on nil requests and negative timestamps.
func TestQueueListRequestValidation(t *testing.T) {
	var nilReq *QueueListRequest
	if err := nilReq.Validate(); err == nil {
		t.Fatal("expected error when validating nil QueueListRequest")
	}

	negativeTimeReq := &QueueListRequest{
		Start: -1,
		End:   1700000300000000000,
	}
	if _, err := BuildOverviewQuery(negativeTimeReq); err == nil {
		t.Fatal("expected error for negative start timestamp")
	}
}
