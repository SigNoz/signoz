package auth

import (
	"context"
	"io/ioutil"
	"log"
	"os"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/require"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/model"
	"google.golang.org/grpc/metadata"
)

func attachToken(ctx context.Context, token string) context.Context {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		md = metadata.New(nil)
	}

	md.Append("accessJwt", token)
	return metadata.NewIncomingContext(ctx, md)
}

func invite(email string) (*model.InviteResponse, error) {
	ctx := context.Background()
	resp, err := Login(ctx, &LoginRequest{
		Email:    constants.RootUserEmail,
		Password: constants.RootUserPassword,
	})
	if err != nil {
		return nil, err
	}

	ctx = attachToken(ctx, resp.AccessJwt)

	return Invite(ctx, &model.InviteRequest{
		Email: email,
		Role:  ROLE_EDITOR,
	})
}

func register(t *testing.T, email, password string) {
	inv, err := invite(email)
	require.NoError(t, err)

	req := &RegisterRequest{
		Email:       email,
		Password:    password,
		InviteToken: inv.InviteToken,
	}
	regErr := Register(context.Background(), req)
	require.Nil(t, regErr)
}

func TestInvite(t *testing.T) {
	inv, err := invite("ahsan@signoz.io")
	require.NoError(t, err)
	require.NotNil(t, inv.InviteToken)

	claims, err := ParseJWT(inv.InviteToken)
	require.NoError(t, err)

	require.Equal(t, "ahsan@signoz.io", claims["email"].(string))
}

func TestRegister(t *testing.T) {
	email := "ahsan@signoz.io"
	password := "password123"

	register(t, email, password)
	user, getErr := dao.DB().GetUserByEmail(context.Background(), email)
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

	// Verify that the claim is correct.
	claims, err := ParseJWT(resp.AccessJwt)
	require.NoError(t, err)

	require.Equal(t, email, claims["email"].(string))

	// Try login using the refresh token.
	resp2, err := Login(context.Background(), &LoginRequest{RefreshToken: resp.RefreshJwt})
	require.NoError(t, err)

	// Verify that the claim is correct.
	claims, err = ParseJWT(resp2.AccessJwt)
	require.NoError(t, err)

	require.Equal(t, email, claims["email"].(string))
}

func TestRootUser(t *testing.T) {
	resp, err := Login(context.Background(), &LoginRequest{
		Email:    constants.RootUserEmail,
		Password: constants.RootUserPassword,
	})
	require.NoError(t, err)

	// Verify that the claim is correct.
	claims, err := ParseJWT(resp.AccessJwt)
	require.NoError(t, err)

	require.Equal(t, constants.RootUserEmail, claims["email"].(string))
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
