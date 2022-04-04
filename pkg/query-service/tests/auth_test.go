package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"testing"

	"github.com/pkg/errors"
	"github.com/stretchr/testify/require"
	"go.signoz.io/query-service/auth"
)

func invite(t *testing.T, email string) *auth.InviteResponse {
	q := endpoint + fmt.Sprintf("/api/v1/invite?email=%s", email)
	resp, err := client.Get(q)
	require.NoError(t, err)

	defer resp.Body.Close()
	b, err := ioutil.ReadAll(resp.Body)
	require.NoError(t, err)

	var inviteResp auth.InviteResponse
	err = json.Unmarshal(b, &inviteResp)
	require.NoError(t, err)

	return &inviteResp
}

func register(email, password, token string) (string, error) {
	q := endpoint + fmt.Sprintf("/api/v1/register")

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
	b, err = ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(b), nil
}

func login(email, password, refreshToken string) (*auth.LoginResponse, error) {
	q := endpoint + fmt.Sprintf("/api/v1/login")

	req := auth.LoginRequest{
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
	b, err = ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, errors.Wrap(err, "failed to read body")
	}

	fmt.Println(string(b))

	loginResp := &auth.LoginResponse{}
	err = json.Unmarshal(b, loginResp)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal")
	}

	return loginResp, nil
}

func TestInviteAPI(t *testing.T) {
	email := "abc@signoz.io"
	resp := invite(t, email)
	require.Equal(t, email, resp.Email)
	require.NotNil(t, resp.InviteToken)
}

func TestRegisterAPI(t *testing.T) {
	email := "abc@signoz.io"
	inv := invite(t, email)

	resp, err := register(email, "password", inv.InviteToken)
	require.NoError(t, err)
	require.Contains(t, resp, "user registered successfully")
}

func TestLoginAPI(t *testing.T) {
	email := "abc@signoz.io"
	password := "password123"
	inv := invite(t, email)

	resp, err := register(email, password, inv.InviteToken)
	require.NoError(t, err)
	require.Contains(t, resp, "user registered successfully")

	loginResp, err := login(email, password, "")
	require.NoError(t, err)

	loginResp2, err := login("", "", loginResp.RefrestJwt)
	require.NoError(t, err)

	require.NotNil(t, loginResp2.AccessJwt)
}
