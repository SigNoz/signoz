package tokenizer

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidate(t *testing.T) {
	testCases := []struct {
		name          string
		provider      string
		secret        string
		expectedError bool
	}{
		{
			name:          "JWTWithSecret",
			provider:      "jwt",
			secret:        "secret",
			expectedError: false,
		},
		{
			name:          "JWTWithoutSecret",
			provider:      "jwt",
			secret:        "",
			expectedError: true,
		},
		{
			name:          "OpaqueWithoutSecret",
			provider:      "opaque",
			secret:        "",
			expectedError: false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			config, ok := newConfig().(*Config)
			assert.True(t, ok)

			config.Provider = testCase.provider
			config.JWT.Secret = testCase.secret

			err := config.Validate()
			if testCase.expectedError {
				assert.Error(t, err)
				return
			}

			assert.NoError(t, err)
		})
	}
}
