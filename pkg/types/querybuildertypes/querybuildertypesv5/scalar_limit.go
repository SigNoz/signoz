package querybuildertypesv5

import (
	"math"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// ApplyScalarLimit applies ordering and limit to scalar (tabular) data.
// It sorts the rows based on the provided order criteria and truncates to limit.
func ApplyScalarLimit(scalar *ScalarData, orderBy []OrderBy, limit int) {
	if len(scalar.Data) == 0 {
		return
	}

	effectiveOrderBy := orderBy
	if len(effectiveOrderBy) == 0 {
		effectiveOrderBy = []OrderBy{
			{
				Key: OrderByKey{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name:          DefaultOrderByKey,
						FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					},
				},
				Direction: OrderDirectionDesc,
			},
		}
	}

	// Build column name -> row index map
	colIndex := make(map[string]int, len(scalar.Columns))
	for i, col := range scalar.Columns {
		colIndex[col.Name] = i
	}

	// Find the first aggregation column for __result ordering
	resultColIdx := -1
	for i, col := range scalar.Columns {
		if col.Type == ColumnTypeAggregation {
			resultColIdx = i
			break
		}
	}

	slices.SortStableFunc(scalar.Data, func(rowI, rowJ []any) int {
		for _, order := range effectiveOrderBy {
			columnName := order.Key.Name
			direction := order.Direction

			if columnName == DefaultOrderByKey {
				if resultColIdx < 0 {
					continue
				}
				valueI := rowCellFloat(rowI, resultColIdx)
				valueJ := rowCellFloat(rowJ, resultColIdx)
				if valueI != valueJ {
					if direction == OrderDirectionAsc {
						if valueI < valueJ {
							return -1
						}
						return 1
					}
					if valueI > valueJ {
						return -1
					}
					return 1
				}
			} else {
				idx, exists := colIndex[columnName]
				if !exists {
					continue
				}
				strI := convertValueToString(rowCellValue(rowI, idx))
				strJ := convertValueToString(rowCellValue(rowJ, idx))
				cmp := strings.Compare(strI, strJ)
				if cmp != 0 {
					if direction == OrderDirectionAsc {
						return cmp
					}
					return -cmp
				}
			}
		}
		return 0
	})

	if limit > 0 && len(scalar.Data) > limit {
		scalar.Data = scalar.Data[:limit]
	}
}

// rowCellFloat extracts a float64 from a row cell, returning 0 for
// missing, NaN, Inf, or non-numeric values.
func rowCellFloat(row []any, idx int) float64 {
	if idx >= len(row) {
		return 0
	}
	switch v := row[idx].(type) {
	case float64:
		if math.IsNaN(v) || math.IsInf(v, 0) {
			return 0
		}
		return v
	case int:
		return float64(v)
	case int64:
		return float64(v)
	default:
		return 0
	}
}

// rowCellValue safely returns the value at idx, or nil if out of bounds.
func rowCellValue(row []any, idx int) any {
	if idx >= len(row) {
		return nil
	}
	return row[idx]
}
