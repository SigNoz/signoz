package auth

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"go.signoz.io/query-service/model"
)

func TestCreateGroup(t *testing.T) {
	ctx := context.Background()
	groupName := "dev"

	g, err := CreateGroup(ctx, groupName)
	require.NoError(t, err)

	g2, err := GetGroup(ctx, g.Id)
	require.NoError(t, err)
	require.Equal(t, g.Name, g2.Name)

	// Creating another group with same name should fail.
	g, err = CreateGroup(ctx, groupName)
	require.Contains(t, err.Error(), "UNIQUE constraint failed: groups.name")
}

func TestAddRule(t *testing.T) {
	ctx := context.Background()

	rule, err := CreateRule(ctx, &model.RBACRule{ApiClass: "dashboard", Permission: ReadPermission})
	require.NoError(t, err)

	readRule, err := GetRule(ctx, rule.Id)
	require.NoError(t, err)

	require.Equal(t, rule.Id, readRule.Id)
	require.Equal(t, "dashboard", readRule.ApiClass)
	require.Equal(t, ReadPermission, readRule.Permission)
}
