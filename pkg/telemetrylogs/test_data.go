package telemetrylogs

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// Helper function to limit string length for display
func limitString(s string, maxLen int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\t", " ")

	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

// Function to build a complete field key map for testing all scenarios
func buildCompleteFieldKeyMap() map[string][]*telemetrytypes.TelemetryFieldKey {
	keysMap := map[string][]*telemetrytypes.TelemetryFieldKey{
		"service.name": {
			{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"body": {
			{
				Name:          "body",
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"http.status_code": {
			{
				Name:          "http.status_code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"status": {
			{
				Name:          "status",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"code": {
			{
				Name:          "code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"count": {
			{
				Name:          "count",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"duration": {
			{
				Name:          "duration",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
		},
		"message": {
			{
				Name:          "message",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"path": {
			{
				Name:          "path",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"email": {
			{
				Name:          "email",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"filename": {
			{
				Name:          "filename",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"amount": {
			{
				Name:          "amount",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
		},
		"error.code": {
			{
				Name:          "error.code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"environment": {
			{
				Name:          "environment",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"user.id": {
			{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"metadata.version": {
			{
				Name:          "metadata.version",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"request.headers.authorization": {
			{
				Name:          "request.headers.authorization",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"response.body.data": {
			{
				Name:          "response.body.data",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"version": {
			{
				Name:          "version",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"response.headers": {
			{
				Name:          "response.headers",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"request.query_params": {
			{
				Name:          "request.query_params",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"level": {
			{
				Name:          "level",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"user.status": {
			{
				Name:          "user.status",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"isEnabled": {
			{
				Name:          "isEnabled",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"isDisabled": {
			{
				Name:          "isDisabled",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"is_valid": {
			{
				Name:          "is_valid",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"is_invalid": {
			{
				Name:          "is_invalid",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"key": {
			{
				Name:          "key",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"status.code": {
			{
				Name:          "status.code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		// Special fields for tests
		"value": {
			{
				Name:          "value",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"threshold": {
			{
				Name:          "threshold",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
		},
		"warning_threshold": {
			{
				Name:          "warning_threshold",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
		},
		"critical_threshold": {
			{
				Name:          "critical_threshold",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
		},
		"type": {
			{
				Name:          "type",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"age": {
			{
				Name:          "age",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"user.email": {
			{
				Name:          "user.email",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"user.name": {
			{
				Name:          "user.name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"user.profile.name": {
			{
				Name:          "user.profile.name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"region": {
			{
				Name:          "region",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"service.type": {
			{
				Name:          "service.type",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"service.deprecated": {
			{
				Name:          "service.deprecated",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"is_automated_test": {
			{
				Name:          "is_automated_test",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"severity": {
			{
				Name:          "severity",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"created_at": {
			{
				Name:          "created_at",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"is_deleted": {
			{
				Name:          "is_deleted",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"customer.type": {
			{
				Name:          "customer.type",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"total_orders": {
			{
				Name:          "total_orders",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"total_spent": {
			{
				Name:          "total_spent",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
		},
		"items[].product.category": {
			{
				Name:          "items[].product.category",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"items[].license_type": {
			{
				Name:          "items[].license_type",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"first_name": {
			{
				Name:          "first_name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"last_name": {
			{
				Name:          "last_name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"address.country": {
			{
				Name:          "address.country",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"address.state": {
			{
				Name:          "address.state",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"address.city": {
			{
				Name:          "address.city",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"subscription.plan": {
			{
				Name:          "subscription.plan",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"subscription.status": {
			{
				Name:          "subscription.status",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"is_expected": {
			{
				Name:          "is_expected",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"http.method": {
			{
				Name:          "http.method",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"http.path": {
			{
				Name:          "http.path",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"http.status": {
			{
				Name:          "http.status",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"response.body.error": {
			{
				Name:          "response.body.error",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"metric.name": {
			{
				Name:          "metric.name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"metric.value": {
			{
				Name:          "metric.value",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
		},
		"metric.rate_of_change": {
			{
				Name:          "metric.rate_of_change",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
		},
		"resource.type": {
			{
				Name:          "resource.type",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"resource.environment": {
			{
				Name:          "resource.environment",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"resource.is_critical": {
			{
				Name:          "resource.is_critical",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"metric.is_monitored": {
			{
				Name:          "metric.is_monitored",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"aggregation.window": {
			{
				Name:          "aggregation.window",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"aggregation.function": {
			{
				Name:          "aggregation.function",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"action": {
			{
				Name:          "action",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"host": {
			{
				Name:          "host",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"metric.type": {
			{
				Name:          "metric.type",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"rate": {
			{
				Name:          "rate",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
		},
		"delta": {
			{
				Name:          "delta",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
		},
		"alerting": {
			{
				Name:          "alerting",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"aggregation": {
			{
				Name:          "aggregation",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"user.created_at": {
			{
				Name:          "user.created_at",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"user.type": {
			{
				Name:          "user.type",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"user.last_login": {
			{
				Name:          "user.last_login",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		"user.failed_logins": {
			{
				Name:          "user.failed_logins",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"user.department": {
			{
				Name:          "user.department",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"user.region": {
			{
				Name:          "user.region",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"user.quota": {
			{
				Name:          "user.quota",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"users[].role": {
			{
				Name:          "users[].role",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"users[].status": {
			{
				Name:          "users[].status",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"orders[].items[].product.id": {
			{
				Name:          "orders[].items[].product.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"data.metrics[].value": {
			{
				Name:          "data.metrics[].value",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
		},
		"data.metrics[].name": {
			{
				Name:          "data.metrics[].name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"requests[].response.status": {
			{
				Name:          "requests[].response.status",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		// Unicode characters in keys
		"école.name": {
			{
				Name:          "école.name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"straße.name": {
			{
				Name:          "straße.name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"日本語.text": {
			{
				Name:          "日本語.text",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"россия.capital": {
			{
				Name:          "россия.capital",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		// Special characters in keys
		"special-key": {
			{
				Name:          "special-key",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"special.key": {
			{
				Name:          "special.key",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"special_key": {
			{
				Name:          "special_key",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"special:key": {
			{
				Name:          "special:key",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"key-with-dashes": {
			{
				Name:          "key-with-dashes",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"key_with_underscore": {
			{
				Name:          "key_with_underscore",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		// Nested paths with dots
		"and.value": {
			{
				Name:          "and.value",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"or.status": {
			{
				Name:          "or.status",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"not.enabled": {
			{
				Name:          "not.enabled",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"like.pattern": {
			{
				Name:          "like.pattern",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"between.min": {
			{
				Name:          "between.min",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"between.max": {
			{
				Name:          "between.max",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"exists.flag": {
			{
				Name:          "exists.flag",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"contains.text": {
			{
				Name:          "contains.text",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"items[0].name": {
			{
				Name:          "items[0].name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"errors[].code": {
			{
				Name:          "errors[].code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"metadata.dimensions": {
			{
				Name:          "metadata.dimensions",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"metadata.dimensions.width": {
			{
				Name:          "metadata.dimensions.width",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"subscription_type": {
			{
				Name:          "subscription_type",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		// Resource-related fields from original example
		"resource.k8s.namespace.name": {
			{
				Name:          "resource.k8s.namespace.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		// Add location field for Unicode test
		"location": {
			{
				Name:          "location",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		// Add description field for Unicode test
		"description": {
			{
				Name:          "description",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		// Add query field for special characters test
		"query": {
			{
				Name:          "query",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"materialized.key.name": {
			{
				Name:          "materialized.key.name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
		},
		"{UserId}": {
			{
				Name:          "{UserId}",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"user@email": {
			{
				Name:          "user@email",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"#user_name": {
			{
				Name:          "#user_name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"gen_ai.completion.0.content": {
			{
				Name:          "gen_ai.completion.0.content",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
	}

	for _, keys := range keysMap {
		for _, key := range keys {
			key.Signal = telemetrytypes.SignalLogs
		}
	}
	return keysMap
}

func buildCompleteFieldKeyMapCollision() map[string][]*telemetrytypes.TelemetryFieldKey {
	keysMap := map[string][]*telemetrytypes.TelemetryFieldKey{
		"service.name": {
			{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"body": {
			{
				Name:          "body",
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"error.code": {
			{
				Name:          "error.code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"environment": {
			{
				Name:          "environment",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"user.id": {
			{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
	}

	for _, keys := range keysMap {
		for _, key := range keys {
			key.Signal = telemetrytypes.SignalLogs
		}
	}
	return keysMap
}
