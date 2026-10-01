package sqlmigration

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRenameSemconvQuickFilterEntries(t *testing.T) {
	testCases := []struct {
		name        string
		filter      string
		wantRenamed string
		wantChanged bool
		wantOK      bool
	}{
		{
			name:        "RenamesEveryOldSpelling",
			filter:      `[{"name":"deployment.environment","fieldContext":"resource","fieldDataType":"string"},{"name":"http.method","fieldContext":"attribute","fieldDataType":"string"}]`,
			wantRenamed: `[{"name":"deployment.environment.name","signal":"","fieldContext":"resource","fieldDataType":"string"},{"name":"http.request.method","signal":"","fieldContext":"attribute","fieldDataType":"string"}]`,
			wantChanged: true,
			wantOK:      true,
		},
		{
			name:        "KeepsCurrentAndUnrelatedNames",
			filter:      `[{"name":"deployment.environment.name","fieldContext":"resource","fieldDataType":"string"},{"name":"service.name","fieldContext":"resource","fieldDataType":"string"}]`,
			wantChanged: false,
			wantOK:      true,
		},
		{
			name:   "ReportsUnparseableFilter",
			filter: `not json`,
			wantOK: false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			renamed, changed, ok := renameSemconvQuickFilterEntries(testCase.filter)
			assert.Equal(t, testCase.wantOK, ok)
			assert.Equal(t, testCase.wantChanged, changed)
			assert.Equal(t, testCase.wantRenamed, renamed)
		})
	}
}
