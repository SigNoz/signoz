package auth

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestInvite(t *testing.T) {
	resp, err := Invite(&InviteRequest{"ahsan@signoz.io"})
	require.NoError(t, err)

	claims, err := ParseJWT(resp.InviteToken)
	require.NoError(t, err)

	require.Equal(t, "ahsan@signoz.io", claims["email"].(string))
}
