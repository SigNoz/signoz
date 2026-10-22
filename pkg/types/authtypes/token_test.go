package authtypes

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	testRotationDuration = 60 * time.Second
	testIdleDuration     = 7 * 24 * time.Hour
	testMaxDuration      = 30 * 24 * time.Hour
)

func newRotatedToken(t *testing.T, rotatedAt time.Time) (*Token, string, string) {
	t.Helper()

	token, err := NewToken(map[string]string{}, valuer.GenerateUUID())
	require.NoError(t, err)

	prevAccessToken, prevRefreshToken := token.AccessToken, token.RefreshToken
	require.NoError(t, token.Rotate(prevAccessToken, prevRefreshToken, testRotationDuration, testIdleDuration, testMaxDuration))
	token.RotatedAt = rotatedAt

	return token, prevAccessToken, prevRefreshToken
}

func TestTokenRotatePrevPair(t *testing.T) {
	testCases := []struct {
		name      string
		rotatedAt time.Time
		wantErr   bool
	}{
		{name: "InsideRotationDuration", rotatedAt: time.Now().Add(-testRotationDuration / 2), wantErr: false},
		{name: "OutsideRotationDuration", rotatedAt: time.Now().Add(-2 * testRotationDuration), wantErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			token, prevAccessToken, prevRefreshToken := newRotatedToken(t, testCase.rotatedAt)
			accessToken, refreshToken := token.AccessToken, token.RefreshToken

			err := token.Rotate(prevAccessToken, prevRefreshToken, testRotationDuration, testIdleDuration, testMaxDuration)
			if testCase.wantErr {
				require.Error(t, err)
				assert.True(t, errors.Ast(err, errors.TypeUnauthenticated))
			} else {
				require.NoError(t, err)
			}

			assert.Equal(t, accessToken, token.AccessToken)
			assert.Equal(t, refreshToken, token.RefreshToken)
			assert.Equal(t, prevAccessToken, token.PrevAccessToken)
			assert.Equal(t, prevRefreshToken, token.PrevRefreshToken)
			assert.Equal(t, testCase.rotatedAt, token.RotatedAt)
		})
	}
}
