package logparsingpipeline

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/entry"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestPipelinePreview(t *testing.T) {
	require := require.New(t)

	testPipelines := []Pipeline{
		{
			OrderId: 1,
			Name:    "pipeline1",
			Alias:   "pipeline1",
			Enabled: true,
			Filter: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{
						Key: v3.AttributeKey{
							Key:      "method",
							DataType: v3.AttributeKeyDataTypeString,
							Type:     v3.AttributeKeyTypeTag,
						},
						Operator: "=",
						Value:    "GET",
					},
				},
			},
			Config: []PipelineOperator{
				{
					OrderId: 1,
					ID:      "add",
					Type:    "add",
					Field:   "attributes.test",
					Value:   "val",
					Enabled: true,
					Name:    "test add",
				},
			},
		},
		{
			OrderId: 2,
			Name:    "pipeline2",
			Alias:   "pipeline2",
			Enabled: true,
			Filter: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{
						Key: v3.AttributeKey{
							Key:      "method",
							DataType: v3.AttributeKeyDataTypeString,
							Type:     v3.AttributeKeyTypeTag,
						},
						Operator: "=",
						Value:    "GET",
					},
				},
			},
			Config: []PipelineOperator{
				{
					OrderId: 1,
					ID:      "add",
					Type:    "add",
					Field:   "resource.test1",
					Value:   "val1",
					Enabled: true,
					Name:    "test add2",
				}, {
					OrderId: 2,
					ID:      "add2",
					Type:    "add",
					Field:   "resource.test2",
					Value:   "val2",
					Enabled: true,
					Name:    "test add3",
				},
			},
		},
	}

	matchingLog := makeTestLogEntry(
		"test log body",
		map[string]string{
			"method": "GET",
		},
	)
	nonMatchingLog := makeTestLogEntry(
		"test log body",
		map[string]string{
			"method": "POST",
		},
	)

	result, err := SimulatePipelinesProcessing(
		context.Background(),
		testPipelines,
		[]model.SignozLog{
			matchingLog,
			nonMatchingLog,
		},
	)

	require.Nil(err)
	require.Equal(2, len(result))

	// matching log should have been modified as expected.
	require.NotEqual(
		matchingLog.Attributes_string,
		result[0].Attributes_string,
	)
	testAttrValue := result[0].Attributes_string["test"]
	require.NotNil(testAttrValue)
	require.Equal(
		testAttrValue, "val",
	)

	require.Equal(result[0].Resources_string, map[string]string{
		"test1": "val1",
		"test2": "val2",
	})

	// non-matching log should not be touched.
	require.Equal(
		nonMatchingLog.Attributes_string,
		result[1].Attributes_string,
	)
	require.Equal(
		nonMatchingLog.Resources_string,
		result[1].Resources_string,
	)

}

func makeTestLogEntry(
	body string,
	attributes map[string]string,
) model.SignozLog {
	return model.SignozLog{
		Timestamp:         uint64(time.Now().UnixNano()),
		Body:              body,
		Attributes_string: attributes,
		Resources_string:  map[string]string{},
		SeverityText:      entry.Info.String(),
		SeverityNumber:    uint8(entry.Info),
		SpanID:            uuid.New().String(),
		TraceID:           uuid.New().String(),
	}
}
