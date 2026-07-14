package exporttypes_test

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/types/exporttypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExportRawDataFormatQueryParamBinding(t *testing.T) {
	tests := []struct {
		name  string
		input map[string][]string
		want  string
	}{
		{
			name:  "missing key defaults to csv",
			input: map[string][]string{},
			want:  "csv",
		},
		{
			name:  "format=csv is accepted",
			input: map[string][]string{"format": {"csv"}},
			want:  "csv",
		},
		{
			name:  "format=jsonl is accepted",
			input: map[string][]string{"format": {"jsonl"}},
			want:  "jsonl",
		},
		{
			name:  "empty value falls back to the default",
			input: map[string][]string{"format": {""}},
			want:  "csv",
		},
		{
			name:  "uppercase FORMAT key is ignored, default applies",
			input: map[string][]string{"FORMAT": {"jsonl"}},
			want:  "csv",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var params exporttypes.ExportRawDataFormatQueryParam
			require.NoError(t, binding.Query.BindQuery(tt.input, &params))
			assert.Equal(t, tt.want, params.Format)
		})
	}
}
