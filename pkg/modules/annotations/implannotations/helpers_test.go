package implannotations

import (
	"context"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/statementbuilder/resourcefilter"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestModule(t *testing.T, fl flagger.Flagger, signal telemetrytypes.Signal) *module {
	t.Helper()
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = map[string][]*telemetrytypes.TelemetryFieldKey{
		"service.name": {{
			Name:          "service.name",
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
		"k8s.namespace.name": {{
			Name:          "k8s.namespace.name",
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
		"deployment.environment": {{
			Name:          "deployment.environment",
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
		"deployment.environment.name": {{
			Name:          "deployment.environment.name",
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
		"http.request.method": {{
			Name:          "http.request.method",
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}},
	}
	for _, keys := range mockMetadataStore.KeysMap {
		for _, key := range keys {
			key.Signal = signal
		}
	}
	return &module{
		telemetryMetadataStore: mockMetadataStore,
		storage:                resourcefilter.NewStorage(),
		fl:                     fl,
		logger:                 instrumentationtest.New().ToProviderSettings().Logger,
	}
}

func buildSQL(clause *sqlbuilder.WhereClause) (string, []any) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("fingerprint")
	sb.From("t")
	sb.AddWhereClause(clause)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return strings.TrimSpace(sql), args
}

func TestBuildFilterClause(t *testing.T) {
	testCases := []struct {
		name     string
		signal   telemetrytypes.Signal
		filter   *qbtypes.Filter
		familyOn bool
		wantSQL  string
		wantArgs []any
	}{
		{
			name:     "NilFilter_EmptyClause",
			signal:   telemetrytypes.SignalTraces,
			filter:   nil,
			wantSQL:  "SELECT fingerprint FROM t",
			wantArgs: nil,
		},
		{
			name:     "WhitespaceExpression_EmptyClause",
			signal:   telemetrytypes.SignalTraces,
			filter:   &qbtypes.Filter{Expression: "   "},
			wantSQL:  "SELECT fingerprint FROM t",
			wantArgs: nil,
		},
		{
			name:     "ResourceKey_Traces_Compiled",
			signal:   telemetrytypes.SignalTraces,
			filter:   &qbtypes.Filter{Expression: "service.name = 'cartservice'"},
			wantSQL:  "SELECT fingerprint FROM t WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?)",
			wantArgs: []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%"},
		},
		{
			name:     "ResourceKey_Logs_Compiled",
			signal:   telemetrytypes.SignalLogs,
			filter:   &qbtypes.Filter{Expression: "k8s.namespace.name = 'shop'"},
			wantSQL:  "SELECT fingerprint FROM t WHERE (simpleJSONExtractString(labels, 'k8s.namespace.name') = ? AND labels LIKE ? AND labels LIKE ?)",
			wantArgs: []any{"shop", "%k8s.namespace.name%", "%k8s.namespace.name\":\"shop%"},
		},
		{
			name:     "InList_Compiled",
			signal:   telemetrytypes.SignalTraces,
			filter:   &qbtypes.Filter{Expression: "service.name IN ('frontend', 'checkout')"},
			wantSQL:  "SELECT fingerprint FROM t WHERE ((simpleJSONExtractString(labels, 'service.name') = ? OR simpleJSONExtractString(labels, 'service.name') = ?) AND labels LIKE ? AND (labels LIKE ? OR labels LIKE ?))",
			wantArgs: []any{"frontend", "checkout", "%service.name%", "%service.name\":\"frontend%", "%service.name\":\"checkout%"},
		},
		{
			name:     "SpanAttributeOnly_EmptyClause",
			signal:   telemetrytypes.SignalTraces,
			filter:   &qbtypes.Filter{Expression: "http.request.method = 'GET'"},
			wantSQL:  "SELECT fingerprint FROM t",
			wantArgs: nil,
		},
		{
			name:     "SpecialCharacters_BoundAsArgs",
			signal:   telemetrytypes.SignalTraces,
			filter:   &qbtypes.Filter{Expression: "service.name = 'ca`rt$0'"},
			wantSQL:  "SELECT fingerprint FROM t WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?)",
			wantArgs: []any{"ca`rt$0", "%service.name%", "%service.name\":\"ca`rt$0%"},
		},
		{
			name:     "EnvironmentFamily_FlagOn_Widened",
			signal:   telemetrytypes.SignalTraces,
			filter:   &qbtypes.Filter{Expression: "deployment.environment = 'production'"},
			familyOn: true,
			wantSQL:  "SELECT fingerprint FROM t WHERE (COALESCE(NULLIF(simpleJSONExtractString(labels, 'deployment.environment.name'), ''), NULLIF(simpleJSONExtractString(labels, 'deployment.environment'), ''), '') = ? AND (labels LIKE ? OR labels LIKE ?) AND (labels LIKE ? OR labels LIKE ?))",
			wantArgs: []any{"production", "%deployment.environment.name%", "%deployment.environment%", "%deployment.environment.name\":\"production%", "%deployment.environment\":\"production%"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fl := flaggertest.New(t)
			if testCase.familyOn {
				fl = flaggertest.WithBooleanFlags(t, map[string]bool{flagger.FeatureResolveSemconvFamilies.String(): true})
			}
			m := newTestModule(t, fl, testCase.signal)

			clause, err := m.buildFilterClause(context.Background(), valuer.UUID{}, testCase.signal, testCase.filter, 1000, 2000)
			require.NoError(t, err)
			require.NotNil(t, clause)

			sql, args := buildSQL(clause)
			assert.Equal(t, testCase.wantSQL, sql)
			assert.Equal(t, testCase.wantArgs, args)
		})
	}
}

func TestBuildFilterClause_ParseError(t *testing.T) {
	m := newTestModule(t, flaggertest.New(t), telemetrytypes.SignalTraces)

	_, err := m.buildFilterClause(context.Background(), valuer.UUID{}, telemetrytypes.SignalTraces, &qbtypes.Filter{Expression: "service.name = "}, 1000, 2000)
	assert.Error(t, err)
}
