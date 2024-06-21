package postprocess

import (
	"fmt"
	"sort"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func transformToTable(results []*v3.Result, params *v3.QueryRangeParamsV3) []*v3.Result {
	if len(results) == 0 {
		return nil
	}

	// Sort results by QueryName
	sort.Slice(results, func(i, j int) bool {
		return results[i].QueryName < results[j].QueryName
	})

	// Create a map to store all unique labels
	seen := make(map[string]bool)
	labelKeys := []string{}
	for _, result := range results {
		for _, series := range result.Series {
			for _, labels := range series.LabelsArray {
				for key := range labels {
					if _, ok := seen[key]; !ok {
						seen[key] = true
						labelKeys = append(labelKeys, key)
					}
				}
			}
		}
	}

	// Create columns
	columns := make([]*v3.TableColumn, 0, len(labelKeys)+len(results))
	for _, key := range labelKeys {
		columns = append(columns, &v3.TableColumn{Name: key})
	}
	for _, result := range results {
		columns = append(columns, &v3.TableColumn{Name: result.QueryName})
	}

	// Create a map to store unique rows
	rowMap := make(map[string]*v3.TableRow)

	for _, result := range results {
		for _, series := range result.Series {
			if len(series.Points) == 0 {
				continue
			}

			// Create a key for the row based on labels
			var keyParts []string
			rowData := make([]interface{}, len(columns))
			for i, key := range labelKeys {
				value := "n/a"
				for _, labels := range series.LabelsArray {
					if v, ok := labels[key]; ok {
						value = v
						break
					}
				}
				keyParts = append(keyParts, fmt.Sprintf("%s=%s", key, value))
				rowData[i] = value
			}
			rowKey := strings.Join(keyParts, ",")

			// Get or create the row
			row, ok := rowMap[rowKey]
			if !ok {
				row = &v3.TableRow{Data: rowData}
				rowMap[rowKey] = row
			}

			// Add the value for this query
			for i, col := range columns {
				if col.Name == result.QueryName {
					row.Data[i] = series.Points[0].Value
					break
				}
			}
		}
	}

	// Convert rowMap to a slice of TableRows
	rows := make([]*v3.TableRow, 0, len(rowMap))
	for _, row := range rowMap {
		rows = append(rows, row)
	}

	// Get sorted query names
	queryNames := make([]string, 0, len(params.CompositeQuery.BuilderQueries))
	for queryName := range params.CompositeQuery.BuilderQueries {
		queryNames = append(queryNames, queryName)
	}
	sort.Strings(queryNames)

	// Sort rows based on OrderBy from BuilderQueries
	sortRows(rows, columns, params.CompositeQuery.BuilderQueries, queryNames)

	// Create the final result
	tableResult := v3.Result{
		Table: &v3.Table{
			Columns: columns,
			Rows:    rows,
		},
	}

	return []*v3.Result{&tableResult}
}

func sortRows(rows []*v3.TableRow, columns []*v3.TableColumn, builderQueries map[string]*v3.BuilderQuery, queryNames []string) {
	sort.SliceStable(rows, func(i, j int) bool {
		for _, queryName := range queryNames {
			query := builderQueries[queryName]
			orderByList := query.OrderBy
			if len(orderByList) == 0 {
				// If no orderBy is specified, sort by value in descending order
				orderByList = []v3.OrderBy{{ColumnName: constants.SigNozOrderByValue, Order: "desc"}}
			}
			for _, orderBy := range orderByList {
				name := orderBy.ColumnName
				if name == constants.SigNozOrderByValue {
					name = queryName
				}
				colIndex := -1
				for k, col := range columns {
					if col.Name == name {
						colIndex = k
						break
					}
				}
				if colIndex == -1 {
					continue
				}

				valI := rows[i].Data[colIndex]
				valJ := rows[j].Data[colIndex]

				// Compare based on the data type
				switch v := valI.(type) {
				case string:
					if w, ok := valJ.(string); ok {
						if v != w {
							return (v < w) == (orderBy.Order == "asc")
						}
					}
				case float64:
					if w, ok := valJ.(float64); ok {
						if v != w {
							return (v < w) == (orderBy.Order == "asc")
						}
					}
				case bool:
					if w, ok := valJ.(bool); ok {
						if v != w {
							return (!v && w) == (orderBy.Order == "asc")
						}
					}
				}
			}
		}
		return false
	})
}
