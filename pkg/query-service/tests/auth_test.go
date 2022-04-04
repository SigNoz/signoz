package tests

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"testing"

	"github.com/stretchr/testify/require"
	"go.signoz.io/query-service/auth"
)

func invite(t *testing.T, email string) *auth.InviteResponse {
	q := endpoint + fmt.Sprintf("/api/v1/invite?email=%s", email)
	resp, err := client.Get(q)
	require.NoError(t, err)

	defer resp.Body.Close()
	b, err := ioutil.ReadAll(resp.Body)

	fmt.Println(string(b))
	var inviteResp map[string]interface{}
	json.Unmarshal(b, inviteResp)

	return &auth.InviteResponse{
		Email:       inviteResp["email"].(string),
		InviteToken: inviteResp["inviteToken"].(string),
	}
}

func TestInviteAPI(t *testing.T) {
	email := "abc@signoz.io"
	resp := invite(t, email)
	require.Equal(t, email, resp.Email)
}
