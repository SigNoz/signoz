package sqlmigration

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeQuickFilterEntries(t *testing.T) {
	tests := []struct {
		name        string
		source      string
		filter      string
		want        string
		wantChanged bool
	}{
		{
			name:        "legacy traces seeds become span fields under their current names",
			source:      "traces",
			filter:      `[{"name":"hasError","signal":"","fieldContext":"attribute","fieldDataType":"bool"},{"name":"name","signal":"","fieldContext":"attribute","fieldDataType":"string"},{"name":"http.route","signal":"","fieldContext":"attribute","fieldDataType":"string"}]`,
			want:        `[{"name":"has_error","signal":"","fieldContext":"span","fieldDataType":"bool"},{"name":"name","signal":"","fieldContext":"span","fieldDataType":"string"},{"name":"http.route","signal":"","fieldContext":"attribute","fieldDataType":"string"}]`,
			wantChanged: true,
		},
		{
			name:        "severity_text seeded as a resource becomes a log field",
			source:      "logs",
			filter:      `[{"name":"severity_text","signal":"","fieldContext":"resource","fieldDataType":"string"},{"name":"service.name","signal":"","fieldContext":"resource","fieldDataType":"string"}]`,
			want:        `[{"name":"severity_text","signal":"","fieldContext":"log","fieldDataType":"string"},{"name":"service.name","signal":"","fieldContext":"resource","fieldDataType":"string"}]`,
			wantChanged: true,
		},
		{
			name:   "already normalized rows are left alone",
			source: "traces",
			filter: `[{"name":"has_error","signal":"","fieldContext":"span","fieldDataType":"bool"}]`,
		},
		{
			name:   "meter rows are left alone",
			source: "meter",
			filter: `[{"name":"name","signal":"metrics","fieldContext":"","fieldDataType":""}]`,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, changed, ok := normalizeQuickFilterEntries(tt.source, tt.filter)
			require.True(t, ok)
			assert.Equal(t, tt.wantChanged, changed)
			if tt.wantChanged {
				assert.JSONEq(t, tt.want, got)
			}
		})
	}

	_, _, ok := normalizeQuickFilterEntries("traces", `not json`)
	assert.False(t, ok)
}
