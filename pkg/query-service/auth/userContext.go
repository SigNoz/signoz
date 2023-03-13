package auth

import (
	"context"

	"github.com/pkg/errors"
	"google.golang.org/grpc/metadata"
)

// UserIdFromContext extracts user from context.Context using accssJwt. here,
// we do not validate if user exists as it would be done so while adding
// user to the context
func UserIdFromContext(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", errors.New("No user metadata found in context")
	}
	userId := md.Get("userId")
	if len(userId) == 0 {
		return "", errors.New("No user found in the context")
	}

	return userId[0], nil
}
