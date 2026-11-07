package queues

import (
	"fmt"
	"strings"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

// Canonical OpenTelemetry messaging system identifiers supported by the queue overview aggregator.
const (
	QueueSystemKafka      = "kafka"
	QueueSystemCelery     = "celery"
	QueueSystemAWSSQS     = "aws_sqs"
	QueueSystemGCPPubSub  = "gcp_pubsub"
	QueueSystemAWSKinesis = "aws_kinesis"
	QueueSystemRedis      = "redis"
)

// queueSystemAliases maps vendor-specific or legacy OpenTelemetry SDK attribute values
// to the canonical messaging_system identifier projected by the ClickHouse overview CTE.
var queueSystemAliases = map[string]string{
	"kafka":             QueueSystemKafka,
	"celery":            QueueSystemCelery,
	"aws_sqs":           QueueSystemAWSSQS,
	"sqs":               QueueSystemAWSSQS,
	"aws.sqs":           QueueSystemAWSSQS,
	"amazonsqs":         QueueSystemAWSSQS,
	"gcp_pubsub":        QueueSystemGCPPubSub,
	"pubsub":            QueueSystemGCPPubSub,
	"googlecloudpubsub": QueueSystemGCPPubSub,
	"gcp.pubsub":        QueueSystemGCPPubSub,
	"aws_kinesis":       QueueSystemAWSKinesis,
	"kinesis":           QueueSystemAWSKinesis,
	"aws.kinesis":       QueueSystemAWSKinesis,
	"amazonkinesis":     QueueSystemAWSKinesis,
	"redis":             QueueSystemRedis,
}

// SupportedQueueSystems returns the ordered list of canonical queue systems
// available in the messaging queue overview query pipeline.
func SupportedQueueSystems() []string {
	return []string{
		QueueSystemKafka,
		QueueSystemCelery,
		QueueSystemAWSSQS,
		QueueSystemGCPPubSub,
		QueueSystemAWSKinesis,
		QueueSystemRedis,
	}
}

// NormalizeQueueSystem resolves a raw queue filter value into its canonical
// OpenTelemetry messaging system identifier, preserving custom system names as lowercase.
func NormalizeQueueSystem(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	lower := strings.ToLower(trimmed)
	if canonical, ok := queueSystemAliases[lower]; ok {
		return canonical
	}
	return lower
}

// NormalizeQueueSystems converts a slice of raw filter values into a deduplicated
// slice of canonical messaging system identifiers.
func NormalizeQueueSystems(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	normalized := make([]string, 0, len(values))
	for _, raw := range values {
		canonical := NormalizeQueueSystem(raw)
		if canonical == "" {
			continue
		}
		if _, exists := seen[canonical]; exists {
			continue
		}
		seen[canonical] = struct{}{}
		normalized = append(normalized, canonical)
	}
	return normalized
}

// QueueListRequest defines the time range and filter payload for querying
// aggregated queue metrics across supported messaging systems.
type QueueListRequest struct {
	Start   int64         `json:"start"` // Epoch timestamp in nanoseconds.
	End     int64         `json:"end"`   // Epoch timestamp in nanoseconds.
	Filters *v3.FilterSet `json:"filters"`
	Limit   int           `json:"limit"`
}

// Validate enforces structural and temporal invariants on the queue overview request
// before ClickHouse SQL generation.
func (qr *QueueListRequest) Validate() error {
	if qr == nil {
		return fmt.Errorf("queue list request cannot be nil")
	}

	if qr.Filters != nil {
		if err := qr.Filters.Validate(); err != nil {
			return err
		}
	}

	if qr.Start < 0 || qr.End < 0 {
		return fmt.Errorf("start and end must be unixnano time")
	}
	return nil
}
