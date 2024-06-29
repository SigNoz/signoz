package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"testing"

	"github.com/pkg/errors"
	"github.com/stretchr/testify/require"

	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func invite(t *testing.T, email string) *model.InviteResponse {
	q := endpoint + fmt.Sprintf("/api/v1/invite?email=%s", email)
	resp, err := client.Get(q)
	require.NoError(t, err)

	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	var inviteResp model.InviteResponse
	err = json.Unmarshal(b, &inviteResp)
	require.NoError(t, err)

	return &inviteResp
}

func register(email, password, token string) (string, error) {
	q := endpoint + "/api/v1/register"

	req := auth.RegisterRequest{
		Email:       email,
		Password:    password,
		InviteToken: token,
	}

	b, err := json.Marshal(req)
	if err != nil {
		return "", err
	}
	resp, err := client.Post(q, "application/json", bytes.NewBuffer(b))
	if err != nil {
		return "", err
	}

	defer resp.Body.Close()
	b, err = io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(b), nil
}

func login(email, password, refreshToken string) (*model.LoginResponse, error) {
	q := endpoint + "/api/v1/login"

	req := model.LoginRequest{
		Email:        email,
		Password:     password,
		RefreshToken: refreshToken,
	}

	b, err := json.Marshal(req)
	if err != nil {
		return nil, errors.Wrap(err, "failed to marshal")
	}
	resp, err := client.Post(q, "application/json", bytes.NewBuffer(b))
	if err != nil {
		return nil, errors.Wrap(err, "failed to post")
	}

	defer resp.Body.Close()
	b, err = io.ReadAll(resp.Body)
	if err != nil {
		return nil, errors.Wrap(err, "failed to read body")
	}

	loginResp := &model.LoginResponse{}
	err = json.Unmarshal(b, loginResp)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal")
	}

	return loginResp, nil
}

func TestAuthInviteAPI(t *testing.T) {
	t.Skip()
	email := "abc@signoz.io"
	resp := invite(t, email)
	require.Equal(t, email, resp.Email)
	require.NotNil(t, resp.InviteToken)
}

func TestAuthRegisterAPI(t *testing.T) {
	email := "alice@signoz.io"
	resp, err := register(email, "Password@123", "")
	require.NoError(t, err)
	require.Contains(t, resp, "user registered successfully")

}

func TestAuthLoginAPI(t *testing.T) {
	t.Skip()
	email := "abc-login@signoz.io"
	password := "Password@123"
	inv := invite(t, email)

	resp, err := register(email, password, inv.InviteToken)
	require.NoError(t, err)
	require.Contains(t, resp, "user registered successfully")

	loginResp, err := login(email, password, "")
	require.NoError(t, err)

	loginResp2, err := login("", "", loginResp.RefreshJwt)
	require.NoError(t, err)

	require.NotNil(t, loginResp2.AccessJwt)
}
