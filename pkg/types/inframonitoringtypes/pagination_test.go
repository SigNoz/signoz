package inframonitoringtypes

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func gbKey(name string) qbtypes.GroupByKey {
	return qbtypes.GroupByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: name}}
}

// fiveHostMap returns a metadataMap with 5 host entries h1..h5.
func fiveHostMap() map[string]map[string]string {
	m := make(map[string]map[string]string, 5)
	for _, n := range []string{"h1", "h2", "h3", "h4", "h5"} {
		m[n] = map[string]string{"host.name": n}
	}
	return m
}

func TestPaginateMetadataByName(t *testing.T) {
	hostGB := []qbtypes.GroupByKey{gbKey("host.name")}

	tests := []struct {
		name          string
		metadataMap   map[string]map[string]string
		groupBy       []qbtypes.GroupByKey
		direction     qbtypes.OrderDirection
		offset, limit int
		sortByMetaKey string
		want          []map[string]string
		wantNotNil    bool // assert empty non-nil slice instead of comparing to want
	}{
		// A. Array out of bounds
		{
			name:          "offset_equals_len",
			metadataMap:   fiveHostMap(),
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        5,
			limit:         10,
			sortByMetaKey: "host.name",
			wantNotNil:    true,
		},
		{
			name:          "offset_way_past_len",
			metadataMap:   fiveHostMap(),
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        100,
			limit:         10,
			sortByMetaKey: "host.name",
			wantNotNil:    true,
		},
		{
			name:          "offset_plus_limit_exceeds_len",
			metadataMap:   fiveHostMap(),
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        3,
			limit:         10,
			sortByMetaKey: "host.name",
			want: []map[string]string{
				{"host.name": "h4"},
				{"host.name": "h5"},
			},
		},
		{
			name:          "limit_exceeds_len",
			metadataMap:   fiveHostMap(),
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        0,
			limit:         100,
			sortByMetaKey: "host.name",
			want: []map[string]string{
				{"host.name": "h1"},
				{"host.name": "h2"},
				{"host.name": "h3"},
				{"host.name": "h4"},
				{"host.name": "h5"},
			},
		},
		{
			name:          "limit_zero",
			metadataMap:   fiveHostMap(),
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        0,
			limit:         0,
			sortByMetaKey: "host.name",
			wantNotNil:    true, // expect empty non-nil slice
		},
		{
			name:          "empty_map",
			metadataMap:   map[string]map[string]string{},
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        0,
			limit:         10,
			sortByMetaKey: "host.name",
			wantNotNil:    true,
		},
		{
			name:          "exact_page",
			metadataMap:   fiveHostMap(),
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        0,
			limit:         5,
			sortByMetaKey: "host.name",
			want: []map[string]string{
				{"host.name": "h1"},
				{"host.name": "h2"},
				{"host.name": "h3"},
				{"host.name": "h4"},
				{"host.name": "h5"},
			},
		},
		{
			name:          "mid_page",
			metadataMap:   fiveHostMap(),
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        2,
			limit:         2,
			sortByMetaKey: "host.name",
			want: []map[string]string{
				{"host.name": "h3"},
				{"host.name": "h4"},
			},
		},
		{
			name:          "last_single",
			metadataMap:   fiveHostMap(),
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        4,
			limit:         1,
			sortByMetaKey: "host.name",
			want: []map[string]string{
				{"host.name": "h5"},
			},
		},

		// B. Nil / missing
		{
			name:          "nil_map",
			metadataMap:   nil,
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        0,
			limit:         10,
			sortByMetaKey: "host.name",
			wantNotNil:    true,
		},
		{
			name: "nil_groupBy",
			metadataMap: map[string]map[string]string{
				"h1": {"host.name": "h1"},
				"h2": {"host.name": "h2"},
			},
			groupBy:       nil,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        0,
			limit:         10,
			sortByMetaKey: "host.name",
			want: []map[string]string{
				{},
				{},
			},
		},
		{
			name: "empty_groupBy",
			metadataMap: map[string]map[string]string{
				"h1": {"host.name": "h1"},
				"h2": {"host.name": "h2"},
			},
			groupBy:       []qbtypes.GroupByKey{},
			direction:     qbtypes.OrderDirectionAsc,
			offset:        0,
			limit:         10,
			sortByMetaKey: "host.name",
			want: []map[string]string{
				{},
				{},
			},
		},
		{
			name: "missing_key_in_entry",
			metadataMap: map[string]map[string]string{
				"h1": {"host.name": "h1", "os.type": "linux"},
				"h2": {"host.name": "h2"}, // os.type absent
			},
			groupBy:       []qbtypes.GroupByKey{gbKey("host.name"), gbKey("os.type")},
			direction:     qbtypes.OrderDirectionAsc,
			offset:        0,
			limit:         10,
			sortByMetaKey: "host.name",
			want: []map[string]string{
				{"host.name": "h1", "os.type": "linux"},
				{"host.name": "h2", "os.type": ""},
			},
		},
		{
			name: "nil_inner_map",
			metadataMap: map[string]map[string]string{
				"h1": nil,
				"h2": {"host.name": "h2"},
			},
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        0,
			limit:         10,
			sortByMetaKey: "host.name",
			// sortVal for h1 = "" (nil map read), for h2 = "h2".
			// Asc order: "" < "h2", so h1 first.
			want: []map[string]string{
				{"host.name": ""},
				{"host.name": "h2"},
			},
		},
		{
			name: "sortByMetaKey_empty_sorts_by_compositeKey",
			metadataMap: map[string]map[string]string{
				"x\x00z": {"a": "x", "b": "z"},
				"x\x00y": {"a": "x", "b": "y"},
			},
			groupBy:       []qbtypes.GroupByKey{gbKey("a"), gbKey("b")},
			direction:     qbtypes.OrderDirectionAsc,
			offset:        0,
			limit:         10,
			sortByMetaKey: "",
			want: []map[string]string{
				{"a": "x", "b": "y"},
				{"a": "x", "b": "z"},
			},
		},
		{
			name: "sortByMetaKey_absent_in_some_entries",
			metadataMap: map[string]map[string]string{
				"h1": {"host.name": "h1"},
				"h2": {}, // host.name absent
				"h3": {"host.name": "h3"},
			},
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        0,
			limit:         10,
			sortByMetaKey: "host.name",
			// h2 sortVal="" sorts first; then h1, h3.
			want: []map[string]string{
				{"host.name": ""},
				{"host.name": "h1"},
				{"host.name": "h3"},
			},
		},

		// C. Sort direction
		{
			name: "asc",
			metadataMap: map[string]map[string]string{
				"h2": {"host.name": "h2"},
				"h1": {"host.name": "h1"},
				"h3": {"host.name": "h3"},
			},
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionAsc,
			offset:        0,
			limit:         10,
			sortByMetaKey: "host.name",
			want: []map[string]string{
				{"host.name": "h1"},
				{"host.name": "h2"},
				{"host.name": "h3"},
			},
		},
		{
			name: "desc",
			metadataMap: map[string]map[string]string{
				"h2": {"host.name": "h2"},
				"h1": {"host.name": "h1"},
				"h3": {"host.name": "h3"},
			},
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirectionDesc,
			offset:        0,
			limit:         10,
			sortByMetaKey: "host.name",
			want: []map[string]string{
				{"host.name": "h3"},
				{"host.name": "h2"},
				{"host.name": "h1"},
			},
		},
		{
			name: "zero_value_direction_falls_into_desc",
			metadataMap: map[string]map[string]string{
				"h2": {"host.name": "h2"},
				"h1": {"host.name": "h1"},
				"h3": {"host.name": "h3"},
			},
			groupBy:       hostGB,
			direction:     qbtypes.OrderDirection{},
			offset:        0,
			limit:         10,
			sortByMetaKey: "host.name",
			want: []map[string]string{
				{"host.name": "h3"},
				{"host.name": "h2"},
				{"host.name": "h1"},
			},
		},
		{
			name: "tie_breaks_on_compositeKey_asc",
			metadataMap: map[string]map[string]string{
				"a\x00b": {"k": "a", "x": "tie"},
				"a\x00c": {"k": "a", "x": "tie"},
			},
			groupBy:       []qbtypes.GroupByKey{gbKey("k"), gbKey("x")},
			direction:     qbtypes.OrderDirectionDesc,
			offset:        0,
			limit:         10,
			sortByMetaKey: "x",
			// Both sortVals "tie"; tie-break on compositeKey asc:
			// "a\x00b" < "a\x00c", so b first.
			want: []map[string]string{
				{"k": "a", "x": "tie"},
				{"k": "a", "x": "tie"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := PaginateMetadataByName(
				tt.metadataMap,
				tt.groupBy,
				tt.direction,
				tt.offset,
				tt.limit,
				tt.sortByMetaKey,
			)
			if tt.wantNotNil {
				assert.NotNil(t, got)
				assert.Len(t, got, 0)
				return
			}
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestPaginateMetadataByName_Deterministic(t *testing.T) {
	m := make(map[string]map[string]string, 10)
	// 10 entries, several with tied host.name values to force compositeKey tie-break.
	for i, n := range []string{"a", "a", "b", "b", "c", "d", "e", "e", "f", "g"} {
		ck := n + "\x00" + string(rune('0'+i))
		m[ck] = map[string]string{"host.name": n, "id": string(rune('0' + i))}
	}
	gb := []qbtypes.GroupByKey{gbKey("host.name"), gbKey("id")}

	first := PaginateMetadataByName(m, gb, qbtypes.OrderDirectionAsc, 0, 10, "host.name")
	for i := range 50 {
		got := PaginateMetadataByName(m, gb, qbtypes.OrderDirectionAsc, 0, 10, "host.name")
		assert.Equal(t, first, got, "iteration %d differed — map-iteration nondeterminism leaked through sort", i)
	}
}
