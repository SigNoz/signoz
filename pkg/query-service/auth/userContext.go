package auth

import (
	"context"
	"net/http"

	"github.com/pkg/errors"
	"google.golang.org/grpc/metadata"
)

// AttachUserToContext extracts user from request and adds it to
// context
func AttachUserToContext(ctx context.Context, r *http.Request) (context.Context, error) {
	userPayload, err := GetUserFromRequest(r)
	if err != nil {
		return ctx, err
	}
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		md = metadata.New(nil)
	}

	md.Append("userId", userPayload.User.Id)
	ctx = metadata.NewIncomingContext(ctx, md)

	return ctx, nil
}

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
