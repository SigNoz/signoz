package authtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTransactionGroupsValueScanRoundTrip(t *testing.T) {
	input := []byte(`[
		{"relation":"read","objectGroup":{"resource":{"type":"metaresource","kind":"dashboard"},"selectors":["*"]}},
		{"relation":"update","objectGroup":{"resource":{"type":"metaresource","kind":"dashboard"},"selectors":["019823cf-c360-7d0a-9a3f-a37656161ff9"]}}
	]`)
	groups, err := NewTransactionGroups(input)
	require.NoError(t, err)

	value, err := groups.Value()
	require.NoError(t, err)

	var scanned TransactionGroups
	require.NoError(t, scanned.Scan(value))
	assert.Equal(t, groups, scanned)
}

func TestTransactionGroupsValueNil(t *testing.T) {
	var groups TransactionGroups
	value, err := groups.Value()
	require.NoError(t, err)
	assert.Nil(t, value)
}

func TestTransactionGroupsScan(t *testing.T) {
	var groups TransactionGroups
	require.NoError(t, groups.Scan(nil))
	assert.Nil(t, groups)

	require.NoError(t, groups.Scan([]byte(`[]`)))
	assert.Empty(t, groups)

	assert.Error(t, groups.Scan("not json"))
	assert.Error(t, groups.Scan(42))
	assert.Error(t, groups.Scan(`[{"relation":"fly","objectGroup":{"resource":{"type":"metaresource","kind":"dashboard"},"selectors":["*"]}}]`))
}

func TestNewTransactionGroupsFromTransactions(t *testing.T) {
	dashboard := coretypes.ResourceRef{Type: coretypes.TypeMetaResource, Kind: coretypes.KindDashboard}
	rule := coretypes.ResourceRef{Type: coretypes.TypeMetaResource, Kind: coretypes.KindRule}

	transactions := []coretypes.Transaction{
		{Verb: coretypes.VerbUpdate, Object: *coretypes.MustNewObject(dashboard, coretypes.WildCardSelectorString)},
		{Verb: coretypes.VerbRead, Object: *coretypes.MustNewObject(dashboard, coretypes.WildCardSelectorString)},
		{Verb: coretypes.VerbRead, Object: *coretypes.MustNewObject(rule, coretypes.WildCardSelectorString)},
	}

	groups := NewTransactionGroupsFromTransactions(transactions)
	require.Len(t, groups, 3)

	for _, group := range groups {
		require.Len(t, group.ObjectGroup.Selectors, 1)
		assert.Equal(t, coretypes.WildCardSelectorString, group.ObjectGroup.Selectors[0].String())
	}

	assert.Equal(t, coretypes.VerbRead, groups[0].Relation.Verb)
	assert.Equal(t, dashboard, groups[0].ObjectGroup.Resource)
	assert.Equal(t, coretypes.VerbRead, groups[1].Relation.Verb)
	assert.Equal(t, rule, groups[1].ObjectGroup.Resource)
	assert.Equal(t, coretypes.VerbUpdate, groups[2].Relation.Verb)
	assert.Equal(t, dashboard, groups[2].ObjectGroup.Resource)
}
