package v4

import (
	"regexp"
	"strings"
	"testing"

	metricsV3 "github.com/SigNoz/signoz/pkg/query-service/app/metrics/v3"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The metric details page redirects to the metrics explorer with a builder
// query that hardcodes an empty temporality while setting a time aggregation
// (see getMetricDetailsQuery in the frontend). That used to make
// AggregationColumnForSamplesTable return an empty string, which was
// interpolated into "... as per_series_value" producing invalid SQL and a 500.
// See https://github.com/SigNoz/signoz/issues/8912
func TestPrepareMetricQueryMetricDetailsRedirect(t *testing.T) {
	mq := &v3.BuilderQuery{
		QueryName:    "A",
		StepInterval: 60,
		DataSource:   v3.DataSourceMetrics,
		AggregateAttribute: v3.AttributeKey{
			Key:      "http_requests_total",
			DataType: v3.AttributeKeyDataTypeFloat64,
			Type:     v3.AttributeKeyTypeUnspecified,
			IsColumn: true,
		},
		Temporality:      "", // redirect hardcodes temporality: ''
		TimeAggregation:  v3.TimeAggregationRate,
		SpaceAggregation: v3.SpaceAggregationSum,
		Expression:       "A",
	}

	start, end := int64(1706428800000), int64(1706434026000)
	query, err := PrepareMetricQuery(start, end, v3.QueryTypeBuilder, v3.PanelTypeGraph, mq, metricsV3.Options{})
	require.NoError(t, err)
	require.NotEmpty(t, query)

	// the temporal aggregation must select a real expression
	assert.Contains(t, query, "sum(value) as per_series_value")

	// ... and never a dangling/empty alias
	danglingAlias := regexp.MustCompile(`(?i),\s*as\s+per_series_value`)
	assert.False(t, danglingAlias.MatchString(query), "generated SQL has a dangling per_series_value alias:\n%s", query)
	assert.False(t, strings.Contains(strings.ToUpper(query), "AS AS PER_SERIES_VALUE"))
}
