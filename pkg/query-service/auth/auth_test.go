package auth

import (
	"context"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/require"
	"go.signoz.io/query-service/dao"
)

func TestInvite(t *testing.T) {
	resp, err := Invite(&InviteRequest{"ahsan@signoz.io"})
	require.NoError(t, err)

	claims, err := ParseJWT(resp.InviteToken)
	require.NoError(t, err)

	require.Equal(t, "ahsan@signoz.io", claims["email"].(string))
}

func TestRegister(t *testing.T) {
	resp, err := Invite(&InviteRequest{"ahsan@signoz.io"})
	require.NoError(t, err)
	req := &RegisterRequest{
		"ahsan@signoz.io",
		"password123",
		resp.InviteToken,
	}

	path := t.TempDir() + "/sqldb"
	err = dao.InitDao("sqlite", path)
	require.NoError(t, err)

	regErr := Register(context.Background(), req)
	require.Nil(t, regErr)
}

func TestLogin(t *testing.T) {
	resp, err := Login(context.Background(), &LoginRequest{"ahsan", "pass"})
	require.NoError(t, err)

	claims, err := ParseJWT(resp.accessJwt)
	require.NoError(t, err)

	require.Equal(t, "ahsan", claims["userId"].(string))
}
