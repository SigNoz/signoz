package sqlmigration

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMigrateQuickFilterEntries(t *testing.T) {
	testCases := []struct {
		description string
		filter      string
		expected    string
		changed     bool
		ok          bool
	}{
		{
			description: "legacy tag and resource entries",
			filter:      `[{"key":"service.name","dataType":"string","type":"resource"},{"key":"http.method","dataType":"string","type":"tag"}]`,
			expected:    `[{"name":"service.name","signal":"","fieldContext":"resource","fieldDataType":"string"},{"name":"http.method","signal":"","fieldContext":"attribute","fieldDataType":"string"}]`,
			changed:     true,
			ok:          true,
		},
		{
			description: "numeric datatypes resolve to number like the fields API reports them",
			filter:      `[{"key":"duration_nano","dataType":"float64","type":"tag"},{"key":"code_line","dataType":"int64","type":"tag"}]`,
			expected:    `[{"name":"duration_nano","signal":"","fieldContext":"attribute","fieldDataType":"number"},{"name":"code_line","signal":"","fieldContext":"attribute","fieldDataType":"number"}]`,
			changed:     true,
			ok:          true,
		},
		{
			description: "meter junk type normalizes to unspecified",
			filter:      `[{"key":"deployment.environment","dataType":"float64","type":"Sum"}]`,
			expected:    `[{"name":"deployment.environment","signal":"","fieldContext":"","fieldDataType":"number"}]`,
			changed:     true,
			ok:          true,
		},
		{
			description: "legacy entry with a signal keeps it",
			filter:      `[{"key":"host.name","dataType":"string","type":"resource","signal":"metrics"}]`,
			expected:    `[{"name":"host.name","signal":"metrics","fieldContext":"resource","fieldDataType":"string"}]`,
			changed:     true,
			ok:          true,
		},
		{
			description: "already migrated entries are untouched",
			filter:      `[{"name":"service.name","signal":"","fieldContext":"resource","fieldDataType":"string","description":"svc"}]`,
			changed:     false,
			ok:          true,
		},
		{
			description: "mixed entries migrate only the legacy ones",
			filter:      `[{"name":"service.name","fieldContext":"resource","fieldDataType":"string"},{"key":"hasError","dataType":"bool","type":"tag"}]`,
			expected:    `[{"name":"service.name","fieldContext":"resource","fieldDataType":"string"},{"name":"hasError","signal":"","fieldContext":"attribute","fieldDataType":"bool"}]`,
			changed:     true,
			ok:          true,
		},
		{
			description: "entries with neither name nor key are dropped",
			filter:      `[{"dataType":"string","type":"tag"},{"key":"service.name","dataType":"string","type":"resource"}]`,
			expected:    `[{"name":"service.name","signal":"","fieldContext":"resource","fieldDataType":"string"}]`,
			changed:     true,
			ok:          true,
		},
		{
			description: "empty list is untouched",
			filter:      `[]`,
			changed:     false,
			ok:          true,
		},
		{
			description: "unparseable filter is reported",
			filter:      `{"key":"not-a-list"}`,
			ok:          false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			migrated, changed, ok := migrateQuickFilterEntries(testCase.filter)
			require.Equal(t, testCase.ok, ok)
			assert.Equal(t, testCase.changed, changed)
			if testCase.changed {
				assert.JSONEq(t, testCase.expected, migrated)
			}
		})
	}
}
