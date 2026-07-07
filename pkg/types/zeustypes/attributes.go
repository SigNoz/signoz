package zeustypes

import "go.opentelemetry.io/otel/attribute"

var (
	// Identifies the organization.
	OrganizationID = attribute.Key("signoz.organization.id")

	// Identifies the retention bucket a meter belongs to.
	RetentionDuration = attribute.Key("signoz.retention.duration")
)

func NewDimensions(kvs ...attribute.KeyValue) map[string]string {
	dimensions := map[string]string{}
	for _, kv := range kvs {
		dimensions[string(kv.Key)] = kv.Value.AsString()
	}

	return dimensions
}
