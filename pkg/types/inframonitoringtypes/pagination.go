package inframonitoringtypes

import (
	"sort"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// PaginateMetadataByName returns metadataMap groups sorted by name
// (lexicographic, asc or desc), paginated by offset/limit, and rebuilt into
// label maps using groupBy. When sortByMetaKey is non-empty, groups are sorted
// by metadataMap[k][sortByMetaKey]; otherwise sorted by composite key directly.
func PaginateMetadataByName(
	metadataMap map[string]map[string]string,
	groupBy []qbtypes.GroupByKey,
	direction qbtypes.OrderDirection,
	offset, limit int,
	sortByMetaKey string,
) []map[string]string {

	pageGroups := make([]map[string]string, 0)
	if offset >= len(metadataMap) {
		return pageGroups
	}
	type entry struct{ compositeKey, sortVal string }
	entries := make([]entry, 0, len(metadataMap))
	for ck, meta := range metadataMap {
		sv := ck
		if sortByMetaKey != "" {
			sv = meta[sortByMetaKey]
		}
		entries = append(entries, entry{compositeKey: ck, sortVal: sv})
	}
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].sortVal != entries[j].sortVal {
			if direction == qbtypes.OrderDirectionAsc {
				return entries[i].sortVal < entries[j].sortVal
			}
			return entries[i].sortVal > entries[j].sortVal
		}
		return entries[i].compositeKey < entries[j].compositeKey
	})

	end := min(offset+limit, len(entries))

	for _, e := range entries[offset:end] {
		attrs := metadataMap[e.compositeKey]
		labels := make(map[string]string, len(groupBy))
		for _, gb := range groupBy {
			labels[gb.Name] = attrs[gb.Name]
		}
		pageGroups = append(pageGroups, labels)
	}
	return pageGroups
}
