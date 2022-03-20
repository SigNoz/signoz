package auth

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLogin(t *testing.T) {
	resp, err := Login(context.Background(), &LoginRequest{"ahsan", "pass"})
	require.NoError(t, err)
	fmt.Printf("%+v\n", resp)
}
