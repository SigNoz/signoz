package services

import (
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildServiceMapQueryAcceptsEnvironmentFamily(t *testing.T) {
	for _, requestedName := range []string{"deployment.environment.name", "deployment.environment"} {
		t.Run(requestedName, func(t *testing.T) {
			tags := []model.TagQuery{model.NewTagQueryString(model.TagQueryParam{
				Key:          requestedName,
				StringValues: []string{"production"},
				Operator:     model.InOperator,
				TagType:      model.ResourceAttributeTagType,
			})}

			query, args := BuildServiceMapQuery(tags)
			argName := "deployment_environment"
			if requestedName == "deployment.environment.name" {
				argName = "deployment_environment_name"
			}
			assert.Equal(t, " AND deployment_environment IN @"+argName, query)
			require.Len(t, args, 1)
			named, ok := args[0].(driver.NamedValue)
			require.True(t, ok)
			assert.Equal(t, argName, named.Name)
			assert.Equal(t, []interface{}{"production"}, named.Value)
		})
	}
}
