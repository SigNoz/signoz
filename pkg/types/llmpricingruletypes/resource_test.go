package llmpricingruletypes

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func TestUpdatableRulesResources(t *testing.T) {
	testCases := []struct {
		name    string
		body    string
		want    []string
		wantErr bool
	}{
		{
			name: "EmptyRules_Wildcard",
			body: `{"rules":[]}`,
			want: []string{"*"},
		},
		{
			name: "Edit_ID",
			body: `{"rules":[{"id":"0b6d1a4e-5c1f-4d2a-9e3b-1f2a3b4c5d6e","isOverride":true}]}`,
			want: []string{"0b6d1a4e-5c1f-4d2a-9e3b-1f2a3b4c5d6e"},
		},
		{
			name: "Create_Wildcard",
			body: `{"rules":[{"modelName":"gpt","isOverride":true}]}`,
			want: []string{"*"},
		},
		{
			name: "SyncRow_Wildcard",
			body: `{"rules":[{"sourceId":"4e9a0b12-3c4d-4e5f-8a6b-7c8d9e0f1a2b"}]}`,
			want: []string{"*"},
		},
		{
			name: "Mixed_DedupedIDsThenWildcardOnce",
			body: `{"rules":[{"id":"6abc2d34-5e6f-4a7b-8c8d-9e0f1a2b3c4d","isOverride":true},{"modelName":"new","isOverride":true},{"id":"6abc2d34-5e6f-4a7b-8c8d-9e0f1a2b3c4d","isOverride":false},{"sourceId":"7bcd3e45-6f7a-4b8c-9d9e-0f1a2b3c4d5e"}]}`,
			want: []string{"6abc2d34-5e6f-4a7b-8c8d-9e0f1a2b3c4d", "*"},
		},
		{
			name: "UppercaseID_Lowercased",
			body: `{"rules":[{"id":"8CDE4F56-7A8B-4C9D-8E0F-1A2B3C4D5E6F","isOverride":true}]}`,
			want: []string{"8cde4f56-7a8b-4c9d-8e0f-1a2b3c4d5e6f"},
		},
		{
			name:    "InvalidID_Rejected",
			body:    `{"rules":[{"id":"not-a-uuid","isOverride":true}]}`,
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			resources, err := UpdatableRulesResources(coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})
			if testCase.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			got := make([]string, 0, len(resources))
			for _, resource := range resources {
				got = append(got, resource.ID)
			}
			assert.Equal(t, testCase.want, got)
		})
	}
}

func TestRuleSelector(t *testing.T) {
	testCases := []struct {
		name string
		id   string
		want []string
	}{
		{
			name: "Wildcard_WildcardOnly",
			id:   "*",
			want: []string{"*"},
		},
		{
			name: "ID_IDThenWildcard",
			id:   "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
			want: []string{"a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", "*"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			selectors, err := RuleSelector(context.Background(), coretypes.ResourceMetaResourceLLMPricingRule, testCase.id, valuer.GenerateUUID())
			require.NoError(t, err)

			got := make([]string, 0, len(selectors))
			for _, selector := range selectors {
				got = append(got, selector.String())
			}
			assert.Equal(t, testCase.want, got)
		})
	}
}
