package queues

import (
    "fmt"
    "strings"

    v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

const (
    QueueKafka   = "kafka"
    QueueCelery  = "celery"
    QueueSQS     = "aws_sqs"
    QueuePubSub  = "gcp_pubsub"
    QueueKinesis = "aws_kinesis"
    QueueRedis   = "redis"
)

var queueSystemAliases = map[string][]string{
    QueueKafka:   {"kafka", "apache_kafka"},
    QueueCelery:  {"celery"},
    QueueSQS:     {"aws_sqs", "sqs", "aws.sqs", "amazonsqs"},
    QueuePubSub:  {"gcp_pubsub", "pubsub", "googlecloudpubsub", "gcp.pubsub", "google_pubsub"},
    QueueKinesis: {"aws_kinesis", "kinesis", "aws.kinesis", "amazonkinesis"},
    QueueRedis:   {"redis", "redis_streams", "redis.streams"},
}

// NormalizeQueueSystem maps OpenTelemetry and vendor-specific queue identifiers
// to their canonical SigNoz messaging queue system key.
func NormalizeQueueSystem(system string) string {
    cleaned := strings.ToLower(strings.TrimSpace(system))
    for canonical, aliases := range queueSystemAliases {
        if cleaned == canonical {
            return canonical
        }
        for _, alias := range aliases {
            if cleaned == alias {
                return canonical
            }
        }
    }
    return cleaned
}

// ExpandQueueSystemAliases returns all recognized attribute values for a given queue filter value.
func ExpandQueueSystemAliases(value interface{}) interface{} {
    switch v := value.(type) {
    case string:
        canonical := NormalizeQueueSystem(v)
        if aliases, ok := queueSystemAliases[canonical]; ok {
            out := make([]interface{}, len(aliases))
            for i, a := range aliases {
                out[i] = a
            }
            return out
        }
        return v
    case []string:
        seen := make(map[string]struct{})
        var out []interface{}
        for _, item := range v {
            canonical := NormalizeQueueSystem(item)
            if aliases, ok := queueSystemAliases[canonical]; ok {
                for _, a := range aliases {
                    if _, exists := seen[a]; !exists {
                        seen[a] = struct{}{}
                        out = append(out, a)
                    }
                }
            } else if _, exists := seen[item]; !exists {
                seen[item] = struct{}{}
                out = append(out, item)
            }
        }
        return out
    case []interface{}:
        seen := make(map[string]struct{})
        var out []interface{}
        for _, raw := range v {
            strVal := fmt.Sprintf("%v", raw)
            canonical := NormalizeQueueSystem(strVal)
            if aliases, ok := queueSystemAliases[canonical]; ok {
                for _, a := range aliases {
                    if _, exists := seen[a]; !exists {
                        seen[a] = struct{}{}
                        out = append(out, a)
                    }
                }
            } else if _, exists := seen[strVal]; !exists {
                seen[strVal] = struct{}{}
                out = append(out, strVal)
            }
        }
        return out
    default:
        return value
    }
}

type QueueListRequest struct {
    Start   int64         `json:"start"` // unix nano
    End     int64         `json:"end"`   // unix nano
    Filters *v3.FilterSet `json:"filters"`
    Limit   int           `json:"limit"`
}

func (qr *QueueListRequest) Validate() error {
    if qr == nil {
        return fmt.Errorf("queue list request cannot be nil")
    }

    if qr.Filters != nil {
        err := qr.Filters.Validate()
        if err != nil {
            return err
        }
    }

    if qr.Start < 0 || qr.End < 0 {
        return fmt.Errorf("start and end must be unixnano time")
    }
    if qr.End > 0 && qr.Start > qr.End {
        return fmt.Errorf("start time cannot be greater than end time")
    }
    return nil
}