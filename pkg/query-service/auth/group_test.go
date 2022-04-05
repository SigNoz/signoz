package auth

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/model"
)

func TestCreateGroup(t *testing.T) {
	ctx := context.Background()
	groupName := "dev"

	require.NoError(t, CreateGroup(ctx, groupName))

	g, err := GetGroup(ctx, constants.RootGroup)
	require.NoError(t, err)
	require.Equal(t, constants.RootGroup, g.Name)
	require.Equal(t, 1, g.Id)

	g, err = GetGroup(ctx, groupName)
	require.NoError(t, err)
	require.Equal(t, groupName, g.Name)
	require.Equal(t, 2, g.Id)
}

func TestAddRule(t *testing.T) {
	ctx := context.Background()

	id, err := CreateRule(ctx, &model.RBACRule{Api: "dashboard", Permission: ReadPermission})
	require.NoError(t, err)

	rule, err := GetRule(ctx, int(id))
	require.NoError(t, err)

	require.Equal(t, id, rule.Id)
	require.Equal(t, "dashboard", rule.Api)
	require.Equal(t, ReadPermission, rule.Permission)
}
