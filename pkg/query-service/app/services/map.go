package services

import (
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"go.signoz.io/signoz/pkg/query-service/model"
)

var (
	columns = map[string]struct{}{
		"deployment_environment": {},
		"k8s_cluster_name":       {},
		"k8s_namespace_name":     {},
	}
)

func BuildServiceMapQuery(tags []model.TagQuery) (string, []interface{}) {
	var filterQuery string
	var namedArgs []interface{}
	for _, tag := range tags {
		key := strings.ReplaceAll(tag.GetKey(), ".", "_")
		operator := tag.GetOperator()
		value := tag.GetValues()

		if _, ok := columns[key]; !ok {
			continue
		}

		switch operator {
		case model.InOperator:
			filterQuery += fmt.Sprintf(" AND %s IN @%s", key, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, value))
		case model.NotInOperator:
			filterQuery += fmt.Sprintf(" AND %s NOT IN @%s", key, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, value))
		case model.EqualOperator:
			filterQuery += fmt.Sprintf(" AND %s = @%s", key, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, value))
		case model.NotEqualOperator:
			filterQuery += fmt.Sprintf(" AND %s != @%s", key, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, value))
		case model.ContainsOperator:
			filterQuery += fmt.Sprintf(" AND %s LIKE @%s", key, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, fmt.Sprintf("%%%s%%", value)))
		case model.NotContainsOperator:
			filterQuery += fmt.Sprintf(" AND %s NOT LIKE @%s", key, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, fmt.Sprintf("%%%s%%", value)))
		case model.StartsWithOperator:
			filterQuery += fmt.Sprintf(" AND %s LIKE @%s", key, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, fmt.Sprintf("%s%%", value)))
		case model.NotStartsWithOperator:
			filterQuery += fmt.Sprintf(" AND %s NOT LIKE @%s", key, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, fmt.Sprintf("%s%%", value)))
		case model.ExistsOperator:
			filterQuery += fmt.Sprintf(" AND %s IS NOT NULL", key)
		case model.NotExistsOperator:
			filterQuery += fmt.Sprintf(" AND %s IS NULL", key)
		}
	}
	return filterQuery, namedArgs
}
