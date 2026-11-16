package querier

import (
	"testing"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReadAsPatterns(t *testing.T) {
	cols := []cmock.ColumnType{
		{Name: qbtypes.PatternsColumnPattern, Type: "String"},
		{Name: qbtypes.PatternsColumnID, Type: "String"},
		{Name: "__GROUP_BY_KEY_0_service.name", Type: "String"},
		{Name: qbtypes.PatternsColumnSampledCount, Type: "UInt64"},
		{Name: qbtypes.PatternsColumnSampleRate, Type: "UInt64"},
		{Name: qbtypes.PatternsColumnTotal, Type: "UInt64"},
		{Name: qbtypes.PatternsColumnFirstSeen, Type: "UInt64"},
		{Name: qbtypes.PatternsColumnLastSeen, Type: "UInt64"},
		{Name: qbtypes.PatternsColumnSamples, Type: "Array(String)"},
		{Name: qbtypes.PatternsColumnSeverities, Type: "Array(String)"},
		{Name: qbtypes.PatternsColumnTrendTs, Type: "Array(Int64)"},
		{Name: qbtypes.PatternsColumnTrendCounts, Type: "Array(Int64)"},
	}
	rows := cmock.NewRows(cols, [][]any{
		{
			"User <*> logged in from <IP>", "13956782398643507091", "api",
			uint64(30), uint64(4), uint64(200),
			uint64(1767225600000000007), uint64(1767231599000000995),
			[]string{"User alice logged in from 10.0.0.1"}, []string{"INFO"},
			[]int64{1767225600000000000, 1767225660000000000}, []int64{10, 20},
		},
		{
			"<IP>", "1", "web",
			uint64(20), uint64(4), uint64(200),
			uint64(1767225600000000000), uint64(1767225600000000000),
			[]string{}, []string{},
			[]int64{}, []int64{},
		},
	})

	data, err := readAsPatterns(rows, "A")
	require.NoError(t, err)

	assert.Equal(t, "A", data.QueryName)
	assert.Equal(t, uint64(4), data.SampleRate)
	assert.Equal(t, uint64(200), data.Total)
	require.Len(t, data.Patterns, 2)

	first := data.Patterns[0]
	assert.Equal(t, "User <*> logged in from <IP>", first.Pattern)
	assert.Equal(t, "13956782398643507091", first.ID)
	assert.Equal(t, uint64(120), first.Count)
	assert.InDelta(t, 60, first.Percent, 1e-9)
	assert.Equal(t, int64(1767225600000), first.FirstSeen)
	assert.Equal(t, int64(1767231599000), first.LastSeen)
	assert.Equal(t, []string{"User alice logged in from 10.0.0.1"}, first.Samples)
	assert.Equal(t, []string{"INFO"}, first.Severities)
	require.Len(t, first.Labels, 1)
	assert.Equal(t, "service.name", first.Labels[0].Key.Name)
	assert.Equal(t, "api", first.Labels[0].Value)
	assert.Equal(t, []*qbtypes.PatternTrendPoint{
		{Timestamp: 1767225600000, Count: 40},
		{Timestamp: 1767225660000, Count: 80},
	}, first.Trend)

	second := data.Patterns[1]
	assert.Equal(t, uint64(80), second.Count)
	assert.InDelta(t, 40, second.Percent, 1e-9)
	assert.Empty(t, second.Trend)
	assert.NotNil(t, second.Samples)
}

func TestReadAsPatterns_NoRows(t *testing.T) {
	rows := cmock.NewRows([]cmock.ColumnType{{Name: qbtypes.PatternsColumnPattern, Type: "String"}}, nil)

	data, err := readAsPatterns(rows, "A")
	require.NoError(t, err)
	assert.Equal(t, uint64(1), data.SampleRate)
	assert.NotNil(t, data.Patterns)
	assert.Empty(t, data.Patterns)
}
