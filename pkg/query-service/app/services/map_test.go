package services

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/stretchr/testify/require"
)

func TestBuildServiceMapQueryFamily(t *testing.T) {
	newSpelling := []model.TagQuery{model.NewTagQueryString(model.TagQueryParam{
		Key:          "deployment.environment.name",
		StringValues: []string{"production"},
		Operator:     model.EqualOperator,
	})}
	oldSpelling := []model.TagQuery{model.NewTagQueryString(model.TagQueryParam{
		Key:          "deployment.environment",
		StringValues: []string{"production"},
		Operator:     model.EqualOperator,
	})}

	query, args := BuildServiceMapQuery(newSpelling, true)
	require.Equal(t, " AND deployment_environment = @deployment_environment_name", query)
	require.Len(t, args, 1)

	query, args = BuildServiceMapQuery(oldSpelling, true)
	require.Equal(t, " AND deployment_environment = @deployment_environment", query)
	require.Len(t, args, 1)

	query, args = BuildServiceMapQuery(newSpelling, false)
	require.Equal(t, "", query)
	require.Empty(t, args)

	query, args = BuildServiceMapQuery(oldSpelling, false)
	require.Equal(t, " AND deployment_environment = @deployment_environment", query)
	require.Len(t, args, 1)
}
