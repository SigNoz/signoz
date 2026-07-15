package authtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTelemetryGrantAndCheckObjectsMatch(t *testing.T) {
	orgID := valuer.GenerateUUID()

	grantGroups := TransactionGroups{
		{
			Relation: Relation{Verb: coretypes.VerbRead},
			ObjectGroup: coretypes.ObjectGroup{
				Resource:  coretypes.ResourceRef{Type: coretypes.TypeTelemetryResource, Kind: coretypes.KindLogs},
				Selectors: []coretypes.Selector{coretypes.TypeTelemetryResource.MustSelector("builder_query/service.name/checkout")},
			},
		},
	}

	grantTuples, err := NewTuplesFromTransactionGroups("scoped-role", orgID, grantGroups)
	require.NoError(t, err)
	require.Len(t, grantTuples, 1)

	checkTuples := NewTuples(
		coretypes.ResourceTelemetryResourceLogs,
		"user:organization/"+orgID.StringValue()+"/user/some-user",
		Relation{Verb: coretypes.VerbRead},
		[]coretypes.Selector{
			coretypes.TypeTelemetryResource.MustSelector("builder_query/service.name/checkout"),
			coretypes.TypeTelemetryResource.MustSelector("builder_query/service.name/payments"),
			coretypes.TypeTelemetryResource.MustSelector("promql/service.name/checkout"),
			coretypes.TypeTelemetryResource.MustSelector("builder_query/service.name/*"),
			coretypes.TypeTelemetryResource.MustSelector("builder_query/*"),
			coretypes.TypeTelemetryResource.MustSelector(coretypes.WildCardSelectorString),
		},
		orgID,
	)
	require.Len(t, checkTuples, 6)

	assert.Equal(t, grantTuples[0].GetObject(), checkTuples[0].GetObject())
	assert.NotEqual(t, grantTuples[0].GetObject(), checkTuples[1].GetObject())
	assert.NotEqual(t, grantTuples[0].GetObject(), checkTuples[2].GetObject())
	assert.Equal(t, "telemetryresource:organization/"+orgID.StringValue()+"/logs/builder_query/service.name/checkout", checkTuples[0].GetObject())
	assert.Equal(t, "telemetryresource:organization/"+orgID.StringValue()+"/logs/builder_query/service.name/*", checkTuples[3].GetObject())
	assert.Equal(t, "telemetryresource:organization/"+orgID.StringValue()+"/logs/builder_query/*", checkTuples[4].GetObject())
	assert.Equal(t, "telemetryresource:organization/"+orgID.StringValue()+"/logs/*", checkTuples[5].GetObject())
}

func TestDiffTuples(t *testing.T) {
	tuple := func(object string) *openfgav1.TupleKey {
		return &openfgav1.TupleKey{User: "role:organization/o/role/r#assignee", Relation: "read", Object: object}
	}

	existing := []*openfgav1.TupleKey{tuple("a"), tuple("b")}
	desired := []*openfgav1.TupleKey{tuple("b"), tuple("c")}

	additions, deletions := DiffTuples(existing, desired)
	require.Len(t, additions, 1)
	assert.Equal(t, "c", additions[0].GetObject())
	require.Len(t, deletions, 1)
	assert.Equal(t, "a", deletions[0].GetObject())

	additions, deletions = DiffTuples(existing, existing)
	assert.Empty(t, additions)
	assert.Empty(t, deletions)
}
