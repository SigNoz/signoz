package promotetypes

import (
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

func resourceKinds(resources []coretypes.ResourceWithID) []string {
	kinds := make([]string, 0, len(resources))
	for _, resource := range resources {
		kinds = append(kinds, resource.Resource.Kind().String())
	}
	return kinds
}

func TestPromotePathsResources(t *testing.T) {
	testCases := []struct {
		name    string
		body    string
		want    []string
		wantErr bool
	}{
		{
			name: "Traces_TracesField",
			body: `[{"signal":"traces","context":"attribute","path":"http.method"}]`,
			want: []string{"traces-field"},
		},
		{
			name: "LogsAndTraces_BothFieldsOnce",
			body: `[{"signal":"logs","context":"body","path":"a"},{"signal":"traces","context":"attribute","path":"b"},{"signal":"logs","context":"body","path":"c"}]`,
			want: []string{"logs-field", "traces-field"},
		},
		{
			name: "Empty_NoResources",
			body: `[]`,
			want: []string{},
		},
		{
			name:    "InvalidSignal_Rejected",
			body:    `[{"signal":"events","context":"attribute","path":"a"}]`,
			wantErr: true,
		},
		{
			name:    "UnsupportedSignal_Rejected",
			body:    `[{"signal":"metrics","context":"attribute","path":"a"}]`,
			wantErr: true,
		},
		{
			name:    "MalformedBody_Rejected",
			body:    `{"signal":"traces"}`,
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			resources, err := PromotePathsResources(coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.want, resourceKinds(resources))
		})
	}
}

func TestListPromotedPathsResources(t *testing.T) {
	testCases := []struct {
		name    string
		query   string
		want    []string
		wantErr bool
	}{
		{
			name:  "NoFilters_EveryField",
			query: "",
			want:  []string{"logs-field", "traces-field"},
		},
		{
			name:  "TracesSignal_TracesField",
			query: "?signal=traces",
			want:  []string{"traces-field"},
		},
		{
			name:  "BodyContext_LogsField",
			query: "?context=body",
			want:  []string{"logs-field"},
		},
		{
			name:  "NoMatchingDomain_EveryField",
			query: "?signal=metrics",
			want:  []string{"logs-field", "traces-field"},
		},
		{
			name:    "InvalidSignal_Rejected",
			query:   "?signal=events",
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			request := httptest.NewRequest("GET", "/api/v1/promoted_path"+testCase.query, nil)
			resources, err := ListPromotedPathsResources(coretypes.ExtractorContext{Request: request})
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.want, resourceKinds(resources))
		})
	}
}
