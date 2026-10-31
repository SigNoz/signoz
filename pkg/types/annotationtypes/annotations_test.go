package annotationtypes

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostableAnnotations_Validate(t *testing.T) {
	testCases := []struct {
		name    string
		req     *PostableAnnotations
		wantErr bool
	}{
		{
			name:    "DeploymentKind_BothSignals_Valid",
			req:     &PostableAnnotations{Kind: AnnotationKindDeployment, Start: 1000, End: 2000, Signals: []telemetrytypes.Signal{telemetrytypes.SignalTraces, telemetrytypes.SignalLogs}, Limit: 100},
			wantErr: false,
		},
		{
			name:    "NoSignals_Valid",
			req:     &PostableAnnotations{Kind: AnnotationKindDeployment, Start: 1000, End: 2000, Limit: 1},
			wantErr: false,
		},
		{
			name:    "NilRequest_Rejected",
			req:     nil,
			wantErr: true,
		},
		{
			name:    "UnknownKind_Rejected",
			req:     &PostableAnnotations{Kind: AnnotationKind{valuer.NewString("incident")}, Start: 1000, End: 2000, Limit: 100},
			wantErr: true,
		},
		{
			name:    "EmptyKind_Rejected",
			req:     &PostableAnnotations{Start: 1000, End: 2000, Limit: 100},
			wantErr: true,
		},
		{
			name:    "StartZero_Rejected",
			req:     &PostableAnnotations{Kind: AnnotationKindDeployment, Start: 0, End: 2000, Limit: 100},
			wantErr: true,
		},
		{
			name:    "EndZero_Rejected",
			req:     &PostableAnnotations{Kind: AnnotationKindDeployment, Start: 1000, End: 0, Limit: 100},
			wantErr: true,
		},
		{
			name:    "StartAfterEnd_Rejected",
			req:     &PostableAnnotations{Kind: AnnotationKindDeployment, Start: 3000, End: 2000, Limit: 100},
			wantErr: true,
		},
		{
			name:    "StartEqualsEnd_Rejected",
			req:     &PostableAnnotations{Kind: AnnotationKindDeployment, Start: 2000, End: 2000, Limit: 100},
			wantErr: true,
		},
		{
			name:    "MetricsSignal_Rejected",
			req:     &PostableAnnotations{Kind: AnnotationKindDeployment, Start: 1000, End: 2000, Signals: []telemetrytypes.Signal{telemetrytypes.SignalMetrics}, Limit: 100},
			wantErr: true,
		},
		{
			name:    "LimitZero_Rejected",
			req:     &PostableAnnotations{Kind: AnnotationKindDeployment, Start: 1000, End: 2000, Limit: 0},
			wantErr: true,
		},
		{
			name:    "LimitNegative_Rejected",
			req:     &PostableAnnotations{Kind: AnnotationKindDeployment, Start: 1000, End: 2000, Limit: -5},
			wantErr: true,
		},
		{
			name:    "LimitAboveMax_Rejected",
			req:     &PostableAnnotations{Kind: AnnotationKindDeployment, Start: 1000, End: 2000, Limit: 5001},
			wantErr: true,
		},
		{
			name:    "LimitAtMax_Valid",
			req:     &PostableAnnotations{Kind: AnnotationKindDeployment, Start: 1000, End: 2000, Limit: 5000},
			wantErr: false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := testCase.req.Validate()
			if !testCase.wantErr {
				assert.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
		})
	}
}

func TestPostableAnnotations_UnmarshalJSON(t *testing.T) {
	testCases := []struct {
		name    string
		body    string
		want    PostableAnnotations
		wantErr bool
	}{
		{
			name: "FullBody_Decoded",
			body: `{"kind":"deployment","start":1000,"end":2000,"signals":["traces"],"filter":{"expression":"service.name = 'cart'"},"limit":50}`,
			want: PostableAnnotations{
				Kind:    AnnotationKindDeployment,
				Start:   1000,
				End:     2000,
				Signals: []telemetrytypes.Signal{telemetrytypes.SignalTraces},
				Limit:   50,
			},
			wantErr: false,
		},
		{
			name:    "InvalidKind_ValidatedOnDecode",
			body:    `{"kind":"release","start":1000,"end":2000,"limit":50}`,
			wantErr: true,
		},
		{
			name:    "MissingLimit_ValidatedOnDecode",
			body:    `{"kind":"deployment","start":1000,"end":2000}`,
			wantErr: true,
		},
		{
			name:    "MalformedJSON_Rejected",
			body:    `{"kind":"deployment",`,
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			var got PostableAnnotations
			err := json.Unmarshal([]byte(testCase.body), &got)
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.want.Kind, got.Kind)
			assert.Equal(t, testCase.want.Start, got.Start)
			assert.Equal(t, testCase.want.End, got.End)
			assert.Equal(t, testCase.want.Signals, got.Signals)
			assert.Equal(t, testCase.want.Limit, got.Limit)
			require.NotNil(t, got.Filter)
			assert.Equal(t, "service.name = 'cart'", got.Filter.Expression)
		})
	}
}
