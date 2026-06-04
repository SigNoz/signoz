package querybuildertypesv5

import (
	"slices"
	"sort"
	"strconv"
	"time"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// SelectEvolutionsForColumns selects the appropriate evolution entries for each column based on the time range.
// Logic:
//   - Finds the latest base evolution (<= tsStartTime) across ALL columns
//   - Rejects all evolutions before this latest base evolution
//   - For duplicate evolutions it considers the oldest one (first in ReleaseTime)
//   - For each column, includes its evolution if it's >= latest base evolution and <= tsEndTime
//   - Results are sorted by ReleaseTime descending (newest first)
func SelectEvolutionsForColumns(columns []*schema.Column, evolutions []*telemetrytypes.EvolutionEntry, tsStart, tsEnd uint64) ([]*schema.Column, []*telemetrytypes.EvolutionEntry, error) {

	sortedEvolutions := make([]*telemetrytypes.EvolutionEntry, len(evolutions))
	copy(sortedEvolutions, evolutions)

	// sort the evolutions by ReleaseTime ascending
	sort.Slice(sortedEvolutions, func(i, j int) bool {
		return sortedEvolutions[i].ReleaseTime.Before(sortedEvolutions[j].ReleaseTime)
	})

	tsStartTime := time.Unix(0, int64(tsStart))
	tsEndTime := time.Unix(0, int64(tsEnd))

	// Build evolution map: column name -> evolution
	evolutionMap := make(map[string]*telemetrytypes.EvolutionEntry)
	for _, evolution := range sortedEvolutions {
		if _, exists := evolutionMap[evolution.ColumnName+":"+evolution.FieldName+":"+strconv.Itoa(int(evolution.Version))]; exists {
			// since if there is duplicate we would just use the oldest one.
			continue
		}
		evolutionMap[evolution.ColumnName+":"+evolution.FieldName+":"+strconv.Itoa(int(evolution.Version))] = evolution
	}

	// Find the latest base evolution (<= tsStartTime) across ALL columns
	// Evolutions are sorted, so we can break early
	var latestBaseEvolutionAcrossAll *telemetrytypes.EvolutionEntry
	for _, evolution := range sortedEvolutions {
		if evolution.ReleaseTime.After(tsStartTime) {
			break
		}
		latestBaseEvolutionAcrossAll = evolution
	}

	// We shouldn't reach this, it basically means there is something wrong with the evolutions data
	if latestBaseEvolutionAcrossAll == nil {
		return nil, nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "no base evolution found for columns %v", columns)
	}

	columnLookUpMap := make(map[string]*schema.Column)
	for _, column := range columns {
		columnLookUpMap[column.Name] = column
	}

	// Collect column-evolution pairs
	type colEvoPair struct {
		column    *schema.Column
		evolution *telemetrytypes.EvolutionEntry
	}
	pairs := []colEvoPair{}

	for _, evolution := range evolutionMap {
		// Reject evolutions before the latest base evolution
		if evolution.ReleaseTime.Before(latestBaseEvolutionAcrossAll.ReleaseTime) {
			continue
		}
		// skip evolutions after tsEndTime
		if evolution.ReleaseTime.After(tsEndTime) || evolution.ReleaseTime.Equal(tsEndTime) {
			continue
		}

		if _, exists := columnLookUpMap[evolution.ColumnName]; !exists {
			return nil, nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "evolution column %s not found in columns %v", evolution.ColumnName, columns)
		}

		pairs = append(pairs, colEvoPair{columnLookUpMap[evolution.ColumnName], evolution})
	}

	// If no pairs found, fall back to latestBaseEvolutionAcrossAll for matching columns
	if len(pairs) == 0 {
		for _, column := range columns {
			// Use latestBaseEvolutionAcrossAll if this column name matches its column name
			if column.Name == latestBaseEvolutionAcrossAll.ColumnName {
				pairs = append(pairs, colEvoPair{column, latestBaseEvolutionAcrossAll})
			}
		}
	}

	// Sort by ReleaseTime descending (newest first)
	slices.SortFunc(pairs, func(a, b colEvoPair) int {
		// Sort by ReleaseTime descending (newest first)
		if a.evolution.ReleaseTime.After(b.evolution.ReleaseTime) {
			return -1
		}
		if a.evolution.ReleaseTime.Before(b.evolution.ReleaseTime) {
			return 1
		}
		return 0
	})

	// Extract results
	newColumns := make([]*schema.Column, len(pairs))
	evolutionsEntries := make([]*telemetrytypes.EvolutionEntry, len(pairs))
	for i, pair := range pairs {
		newColumns[i] = pair.column
		evolutionsEntries[i] = pair.evolution
	}

	return newColumns, evolutionsEntries, nil
}
