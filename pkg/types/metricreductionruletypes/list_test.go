package metricreductionruletypes_test

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListReductionRulesParamsSortDefaults(t *testing.T) {
	var params metricreductionruletypes.ListReductionRulesParams
	require.NoError(t, binding.Query.BindQuery(map[string][]string{"limit": {"10"}}, &params))

	assert.Equal(t, metricreductionruletypes.OrderByIngestedVolume, params.OrderBy, "orderBy defaults to ingested volume")
	assert.Equal(t, metricreductionruletypes.OrderDesc, params.Order, "order defaults to desc")
}

func TestListReductionRulesParamsValidate(t *testing.T) {
	require.Error(t, (&metricreductionruletypes.ListReductionRulesParams{Limit: 0}).Validate(), "limit must be set")
	require.Error(t, (&metricreductionruletypes.ListReductionRulesParams{Limit: 10, Offset: -1}).Validate(), "offset must not be negative")
	require.NoError(t, (&metricreductionruletypes.ListReductionRulesParams{Limit: 10}).Validate())
}
