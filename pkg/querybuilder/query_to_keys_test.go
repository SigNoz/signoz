package querybuilder

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestQueryToKeys(t *testing.T) {
	testCases := []struct {
		query        string
		expectedKeys []*telemetrytypes.FieldKeySelector
	}{
		{
			query: `service.name="redis"`,
			expectedKeys: []*telemetrytypes.FieldKeySelector{
				{
					Name:          "service.name",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextUnspecified,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
		{
			query: `resource.service.name="redis"`,
			expectedKeys: []*telemetrytypes.FieldKeySelector{
				{
					Name:          "service.name",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextResource,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
		{
			query: `service.name="redis" AND http.status_code=200`,
			expectedKeys: []*telemetrytypes.FieldKeySelector{
				{
					Name:          "service.name",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextUnspecified,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
				{
					Name:          "http.status_code",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextUnspecified,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
		{
			query: `has(payload.user_ids, 123)`,
			expectedKeys: []*telemetrytypes.FieldKeySelector{
				{
					Name:          "payload.user_ids",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextUnspecified,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
		{
			query: `body.user_ids[*] = 123`,
			expectedKeys: []*telemetrytypes.FieldKeySelector{
				{
					Name:          "user_ids[*]",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextBody,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
		{
			query: `exact(resource.deployment.environment) EXISTS AND resource.service.name = 'api'`,
			expectedKeys: []*telemetrytypes.FieldKeySelector{
				{
					Name:            "deployment.environment",
					Signal:          telemetrytypes.SignalUnspecified,
					FieldContext:    telemetrytypes.FieldContextResource,
					FieldDataType:   telemetrytypes.FieldDataTypeUnspecified,
					FieldResolution: telemetrytypes.FieldResolutionExact,
				},
				{
					Name:          "service.name",
					Signal:        telemetrytypes.SignalUnspecified,
					FieldContext:  telemetrytypes.FieldContextResource,
					FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				},
			},
		},
	}

	for _, testCase := range testCases {
		keys := QueryStringToKeysSelectors(testCase.query)
		assert.Equal(t, testCase.expectedKeys, keys, "query %q should retain every key selector property", testCase.query)
	}
}
