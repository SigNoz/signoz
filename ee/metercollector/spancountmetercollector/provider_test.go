package spancountmetercollector

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/modules/retention/implretention"
	"github.com/SigNoz/signoz/pkg/types/retentiontypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestBuildDimensions(t *testing.T) {
	orgID := valuer.GenerateUUID()

	dimensions := buildDimensions(orgID, 30)
	require.Equal(t, map[string]string{
		zeustypes.MeterDimensionOrganizationID:    orgID.StringValue(),
		zeustypes.MeterDimensionRetentionDuration: "30",
	}, dimensions)
}

func TestBuildQueryGroupsOnlyByRetentionDays(t *testing.T) {
	retentionGetter := implretention.NewGetter(nil)
	slice := retentiontypes.Slice{
		StartMs:     1,
		EndMs:       2,
		DefaultDays: 30,
		Rules: []retentiontypes.CustomRetentionRule{{
			Filters: []retentiontypes.FilterCondition{
				{Key: "signoz.workspace.key.id", Values: []string{"workspace-1"}},
				{Key: "service.name", Values: []string{"api"}},
			},
			TTLDays: 7,
		}},
	}

	query, args, err := buildQuery(MeterName.String(), slice, retentionGetter)
	require.NoError(t, err)
	require.NotEmpty(t, args)
	require.Contains(t, query, "GROUP BY retention_days")
	require.NotContains(t, query, "retention_rule_index")
	require.NotContains(t, query, " AS dim_")
}

func TestProviderMetadata(t *testing.T) {
	provider := New(nil, nil)

	require.Equal(t, "signoz.meter.span.count", provider.Name().String())
	require.Equal(t, zeustypes.MeterUnitCount, provider.Unit())
	require.Equal(t, zeustypes.MeterAggregationSum, provider.Aggregation())
}

func TestBucketKeyIsStable(t *testing.T) {
	first := bucketKey(map[string]string{
		"service.name": "api",
		zeustypes.MeterDimensionRetentionDuration: "30",
	})
	second := bucketKey(map[string]string{
		zeustypes.MeterDimensionRetentionDuration: "30",
		"service.name": "api",
	})

	require.Equal(t, first, second)
	require.NotEmpty(t, first)
}
