package services

import (
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/semconv"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func BuildServiceMapQuery(tags []model.TagQuery, resolveSemconvFamilies bool) (string, []interface{}) {
	columns := map[string]string{
		"deployment_environment": "deployment_environment",
		"k8s_cluster_name":       "k8s_cluster_name",
		"k8s_namespace_name":     "k8s_namespace_name",
	}
	if resolveSemconvFamilies {
		for _, member := range semconv.Members(semconv.KindAttribute, telemetrytypes.FieldKeySelector{
			Name:         "deployment.environment.name",
			Signal:       telemetrytypes.SignalTraces,
			FieldContext: telemetrytypes.FieldContextResource,
		}) {
			columns[strings.ReplaceAll(member, ".", "_")] = "deployment_environment"
		}
	}
	var filterQuery string
	var namedArgs []interface{}
	for _, tag := range tags {
		key := strings.ReplaceAll(tag.GetKey(), ".", "_")
		operator := tag.GetOperator()
		value := tag.GetValues()

		column, ok := columns[key]
		if !ok {
			continue
		}

		switch operator {
		case model.InOperator:
			filterQuery += fmt.Sprintf(" AND %s IN @%s", column, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, value))
		case model.NotInOperator:
			filterQuery += fmt.Sprintf(" AND %s NOT IN @%s", column, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, value))
		case model.EqualOperator:
			filterQuery += fmt.Sprintf(" AND %s = @%s", column, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, value))
		case model.NotEqualOperator:
			filterQuery += fmt.Sprintf(" AND %s != @%s", column, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, value))
		case model.ContainsOperator:
			filterQuery += fmt.Sprintf(" AND %s LIKE @%s", column, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, fmt.Sprintf("%%%s%%", value)))
		case model.NotContainsOperator:
			filterQuery += fmt.Sprintf(" AND %s NOT LIKE @%s", column, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, fmt.Sprintf("%%%s%%", value)))
		case model.StartsWithOperator:
			filterQuery += fmt.Sprintf(" AND %s LIKE @%s", column, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, fmt.Sprintf("%s%%", value)))
		case model.NotStartsWithOperator:
			filterQuery += fmt.Sprintf(" AND %s NOT LIKE @%s", column, key)
			namedArgs = append(namedArgs, clickhouse.Named(key, fmt.Sprintf("%s%%", value)))
		case model.ExistsOperator:
			filterQuery += fmt.Sprintf(" AND %s IS NOT NULL", column)
		case model.NotExistsOperator:
			filterQuery += fmt.Sprintf(" AND %s IS NULL", column)
		}
	}
	return filterQuery, namedArgs
}
