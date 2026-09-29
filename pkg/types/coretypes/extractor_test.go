package coretypes

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type roleAssignment struct {
	RoleID string
	Roles  []string
}

type otherRequest struct{}

func TestBodyAs(t *testing.T) {
	body := &roleAssignment{RoleID: "r1"}
	ec := ExtractorContext{Body: body}

	typed, err := BodyAs[roleAssignment](ec)
	require.NoError(t, err)
	assert.Same(t, body, typed)

	_, err = BodyAs[otherRequest](ec)
	assert.Error(t, err)

	_, err = BodyAs[roleAssignment](ExtractorContext{})
	assert.Error(t, err)
}

func TestBodyFieldAndBodyFields(t *testing.T) {
	ec := ExtractorContext{Body: &roleAssignment{RoleID: "r1", Roles: []string{"a", "b"}}}

	assert.True(t, BodyField(func(req *roleAssignment) string { return req.RoleID }).RequiresBody)
	assert.True(t, OneID(BodyField(func(req *roleAssignment) string { return req.RoleID })).RequiresBody)
	assert.False(t, PathParam("id").RequiresBody)

	id, err := BodyField(func(req *roleAssignment) string { return req.RoleID }).Fn(ec)
	require.NoError(t, err)
	assert.Equal(t, "r1", id)

	ids, err := BodyFields(func(req *roleAssignment) []string { return req.Roles }).Fn(ec)
	require.NoError(t, err)
	assert.Equal(t, []string{"a", "b"}, ids)

	_, err = BodyField(func(*otherRequest) string { return "" }).Fn(ec)
	assert.Error(t, err)
}

func TestBodyFromContext(t *testing.T) {
	body := &roleAssignment{RoleID: "r1"}
	ctx := NewContextWithExtractorContext(context.Background(), ExtractorContext{Body: body})

	typed, err := BodyFromContext[roleAssignment](ctx)
	require.NoError(t, err)
	assert.Same(t, body, typed)

	_, err = BodyFromContext[otherRequest](ctx)
	assert.Error(t, err)

	_, err = BodyFromContext[roleAssignment](context.Background())
	assert.Error(t, err)
}
