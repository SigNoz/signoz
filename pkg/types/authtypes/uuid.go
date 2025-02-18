package authtypes

import (
	"context"
	"errors"
)

type uuidKey struct{}

type UUID struct {
}

func NewUUID() *UUID {
	return &UUID{}
}

func (u *UUID) ContextFromRequest(ctx context.Context, values ...string) (context.Context, error) {
	var value string
	for _, v := range values {
		if v != "" {
			value = v
			break
		}
	}

	if value == "" {
		return ctx, errors.New("missing Authorization header")
	}

	return NewContextWithUUID(ctx, value), nil
}

func NewContextWithUUID(ctx context.Context, uuid string) context.Context {
	return context.WithValue(ctx, uuidKey{}, uuid)
}

func UUIDFromContext(ctx context.Context) (string, bool) {
	uuid, ok := ctx.Value(uuidKey{}).(string)
	return uuid, ok
}
