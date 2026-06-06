package audittypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/stretchr/testify/assert"
)

func TestCategoryFor(t *testing.T) {
	assert.Equal(t, ActionCategoryAccessControl, CategoryFor(coretypes.ResourceServiceAccount))
	assert.Equal(t, ActionCategoryAccessControl, CategoryFor(coretypes.ResourceRole))
	assert.Equal(t, ActionCategoryAccessControl, CategoryFor(coretypes.ResourceMetaResourceFactorAPIKey))
	assert.Equal(t, ActionCategoryConfigurationChange, CategoryFor(coretypes.ResourceMetaResourceDashboard))
	assert.Equal(t, ActionCategoryConfigurationChange, CategoryFor(coretypes.ResourceMetaResourceNotificationChannel))
}

func TestNewBodyWithRelated(t *testing.T) {
	auditAttributes := AuditAttributes{Action: coretypes.VerbAttach, Outcome: OutcomeSuccess}
	principalAttributes := PrincipalAttributes{}
	resourceAttributes := NewRelatedResourceAttributes("sa-1", coretypes.MustNewKind("serviceaccount"), "key-9", coretypes.MustNewKind("factor-api-key"))

	body := newBody(auditAttributes, principalAttributes, resourceAttributes, ErrorAttributes{})
	assert.Contains(t, body, "serviceaccount (sa-1)")
	assert.Contains(t, body, "related factor-api-key (key-9)")
}
