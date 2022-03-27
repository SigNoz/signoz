package auth

import (
	"context"
	"io/ioutil"
	"log"
	"os"
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

func register(t *testing.T, email, password string) {
	resp, err := Invite(&InviteRequest{email})
	require.NoError(t, err)

	req := &RegisterRequest{
		email,
		password,
		resp.InviteToken,
	}
	regErr := Register(context.Background(), req)
	require.Nil(t, regErr)
}

func TestRegister(t *testing.T) {
	email := "ahsan@signoz.io"
	password := "password123"

	register(t, email, password)
	user, getErr := dao.DB().FetchUser(context.Background(), email)
	require.Nil(t, getErr)

	require.Equal(t, email, user.Email)
}

func TestLogin(t *testing.T) {
	email := "pro@signoz.io"
	password := "password123"

	// Login should fail for non-existing user.
	resp, err := Login(context.Background(), &LoginRequest{
		Email:    email,
		Password: password,
	})
	require.Error(t, err, ErrorInvalidCreds)
	require.Nil(t, resp)

	// Login should succeed after creating the user.
	register(t, email, password)
	resp, err = Login(context.Background(), &LoginRequest{
		Email:    email,
		Password: password,
	})
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Verify that the claim is correct.
	claims, err := ParseJWT(resp.accessJwt)
	require.NoError(t, err)

	require.Equal(t, email, claims["email"].(string))
}

func TestMain(m *testing.M) {
	f, err := ioutil.TempFile("", "sqldb")
	if err != nil {
		log.Fatal(err)
	}

	if err := dao.InitDao("sqlite", f.Name()); err != nil {
		log.Fatal(err)
	}
	os.Exit(m.Run())
}
