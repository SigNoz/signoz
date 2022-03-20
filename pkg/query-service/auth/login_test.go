package auth

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLogin(t *testing.T) {
	resp, err := Login(context.Background(), &LoginRequest{"ahsan", "pass"})
	require.NoError(t, err)

	claims, err := ParseJWT(resp.accessJwt)
	require.NoError(t, err)

	require.Equal(t, "ahsan", claims["userId"].(string))
}
