package queues

import (
    "strings"
    "testing"

    v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

func TestNormalizeQueueSystem(t *testing.T) {
    tests := []struct {
        input    string
        expected string
    }{
        {"sqs", QueueSQS},
        {"aws.sqs", QueueSQS},
        {"AmazonSQS", QueueSQS},
        {"aws_sqs", QueueSQS},
        {"pubsub", QueuePubSub},
        {"googlecloudpubsub", QueuePubSub},
        {"gcp.pubsub", QueuePubSub},
        {"gcp_pubsub", QueuePubSub},
        {"kinesis", QueueKinesis},
        {"aws.kinesis", QueueKinesis},
        {"aws_kinesis", QueueKinesis},
        {"redis", QueueRedis},
        {"redis.streams", QueueRedis},
        {"kafka", QueueKafka},
        {"celery", QueueCelery},
    }

    for _, tc := range tests {
        got := NormalizeQueueSystem(tc.input)
        if got != tc.expected {
            t.Errorf("NormalizeQueueSystem(%q) = %q; want %q", tc.input, got, tc.expected)
        }
    }
}

func TestBuildOverviewQuery_SupportedQueues(t *testing.T) {
    queueFilters := []struct {
        filterVal     string
        canonicalName string
        destAttr      string
    }{
        {"sqs", "aws_sqs", "aws.sqs.queue.name"},
        {"pubsub", "gcp_pubsub", "pubsub.topic"},
        {"kinesis", "aws_kinesis", "aws.kinesis.stream_name"},
        {"redis", "redis", "redis.stream"},
    }

    for _, qf := range queueFilters {
        req := &QueueListRequest{
            Start: 1700000000000000000,
            End:   1700000300000000000,
            Filters: &v3.FilterSet{
                Operator: "AND",
                Items: []v3.FilterItem{
                    {
                        Key:      v3.AttributeKey{Key: "queue", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag},
                        Operator: v3.FilterOperatorIn,
                        Value:    qf.filterVal,
                    },
                },
            },
            Limit: 100,
        }

        chQuery, err := BuildOverviewQuery(req)
        if err != nil {
            t.Fatalf("BuildOverviewQuery failed for %s: %v", qf.filterVal, err)
        }
        if chQuery == nil || chQuery.Query == "" {
            t.Fatalf("expected non-empty query for %s", qf.filterVal)
        }
        if !strings.Contains(chQuery.Query, qf.canonicalName) {
            t.Errorf("expected SQL query to contain canonical queue name %q", qf.canonicalName)
        }
        if !strings.Contains(chQuery.Query, qf.destAttr) {
            t.Errorf("expected SQL query to extract destination attribute %q", qf.destAttr)
        }
    }
}

func TestQueueListRequest_Validate(t *testing.T) {
    invalidReq := &QueueListRequest{
        Start: -10,
        End:   100,
        Filters: &v3.FilterSet{
            Operator: "AND",
            Items:    []v3.FilterItem{},
        },
    }
    if err := invalidReq.Validate(); err == nil {
        t.Errorf("expected error for negative start timestamp, got nil")
    }

    reversedReq := &QueueListRequest{
        Start: 200,
        End:   100,
    }
    if err := reversedReq.Validate(); err == nil {
        t.Errorf("expected error when start > end, got nil")
    }
}