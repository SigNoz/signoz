package impllmpricingrule

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/types/llmpricingruletypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type testStore struct {
	llmpricingruletypes.Store
	rules []*llmpricingruletypes.LLMPricingRule
}

func (s testStore) List(context.Context, valuer.UUID, int, int, string, *bool) ([]*llmpricingruletypes.LLMPricingRule, int, error) {
	return s.rules, len(s.rules), nil
}

type testQuerier struct {
	querier.Querier
}

func (testQuerier) QueryRange(context.Context, valuer.UUID, *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error) {
	return &qbtypes.QueryRangeResponse{
		Data: qbtypes.QueryData{Results: []any{&qbtypes.ScalarData{
			Columns: []*qbtypes.ColumnDescriptor{
				{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: llmpricingruletypes.GenAIRequestModel},
					Type:              qbtypes.ColumnTypeGroup,
				},
				{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: llmpricingruletypes.GenAIProviderName},
					Type:              qbtypes.ColumnTypeGroup,
				},
				{Type: qbtypes.ColumnTypeAggregation},
			},
			Data: [][]any{{"gpt-4o-2024-11-20", "openai", uint64(3)}},
		}}},
	}, nil
}

func TestListUnmappedModelsIgnoresDisabledRules(t *testing.T) {
	for _, test := range []struct {
		name         string
		enabled      bool
		wantUnmapped int
	}{
		{name: "enabled matching rule", enabled: true, wantUnmapped: 0},
		{name: "disabled matching rule", enabled: false, wantUnmapped: 1},
	} {
		t.Run(test.name, func(t *testing.T) {
			rules := []*llmpricingruletypes.LLMPricingRule{{
				ModelPattern: llmpricingruletypes.StringSlice{"gpt-4o*"},
				Enabled:      test.enabled,
			}}
			got, err := NewModule(testStore{rules: rules}, nil, testQuerier{}).
				ListUnmappedModels(context.Background(), valuer.GenerateUUID())
			if err != nil {
				t.Fatal(err)
			}
			if len(got) != test.wantUnmapped {
				t.Fatalf("got %d unmapped models, want %d", len(got), test.wantUnmapped)
			}
		})
	}
}
