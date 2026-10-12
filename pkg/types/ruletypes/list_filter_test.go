package ruletypes

import (
	"testing"

	qbtypesv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
)

func TestReservedFilterKeys(t *testing.T) {
	assert.Equal(t, []DSLKey{
		DSLKeyAlertType,
		DSLKeyCreatedAt,
		DSLKeyCreatedBy,
		DSLKeyLabelsPlaceholder,
		DSLKeyName,
		DSLKeyRuleType,
		DSLKeySeverity,
		DSLKeyUpdatedAt,
		DSLKeyUpdatedBy,
	}, ReservedFilterKeys())
}

func TestFilterOpsExcludeRegexp(t *testing.T) {
	for key, ops := range ReservedOps {
		assert.NotEmpty(t, ops, "key %q has no operators", key)
		assert.NotContains(t, ops, qbtypesv5.FilterOperatorRegexp, "key %q allows REGEXP", key)
		assert.NotContains(t, ops, qbtypesv5.FilterOperatorNotRegexp, "key %q allows NOT REGEXP", key)
	}
	assert.NotContains(t, LabelsKeyOps, qbtypesv5.FilterOperatorRegexp)
	assert.NotContains(t, LabelsKeyOps, qbtypesv5.FilterOperatorNotRegexp)
	assert.Contains(t, LabelsKeyOps, qbtypesv5.FilterOperatorExists)
	assert.Contains(t, LabelsKeyOps, qbtypesv5.FilterOperatorNotExists)
}
