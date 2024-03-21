// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package awsmsk

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuthentication(t *testing.T) {
	t.Parallel()

	const (
		AccessKey  = "testing"
		SecretKey  = "hunter2"
		BrokerName = "http://localhost:8089"
		UserAgent  = "kafka-exporter"
		region     = "us-east-1"
	)

	mskAuth := NewIAMSASLClient(BrokerName, region, UserAgent).(*IAMSASLClient)
	require.NotNil(t, mskAuth, "Must have a valid client")

	assert.NoError(t, mskAuth.Begin(AccessKey, SecretKey, ""))
	require.NotNil(t, mskAuth.signer, "Must have a valid signer")
	assert.Equal(t, initMessage, mskAuth.state, "Must be in the initial state")

	payload, err := mskAuth.Step("") // Initial Challenge
	assert.NoError(t, err, "Must not error on the initial challenge")
	assert.NotEmpty(t, payload, "Must have a valid payload with data")

	expectedFields := map[string]struct{}{
		"version":             {},
		"host":                {},
		"user-agent":          {},
		"action":              {},
		"x-amz-algorithm":     {},
		"x-amz-credential":    {},
		"x-amz-date":          {},
		"x-amz-signedheaders": {},
		"x-amz-expires":       {},
		"x-amz-signature":     {},
	}

	var request map[string]string
	assert.NoError(t, json.NewDecoder(strings.NewReader(payload)).Decode(&request))

	for k := range expectedFields {
		v, ok := request[k]
		assert.True(t, ok, "Must have the expected field")
		assert.NotEmpty(t, v, "Must have a value for the field")
	}

	_, err = mskAuth.Step(`{"version": "2020_10_22", "request-id": "pine apple sauce"}`)
	assert.NoError(t, err, "Must not error when given valid challenge")
	assert.True(t, mskAuth.Done(), "Must have completed auth")
}

func TestValidatingServerResponse(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		scenario   string
		challenge  string
		expectErr  error
		expectDone bool
	}{
		{
			scenario:   "Valid challenge payload",
			challenge:  `{"version": "2020_10_22", "request-id": "pine apple sauce"}`,
			expectErr:  nil,
			expectDone: true,
		},
		{
			scenario:   "Empty challenge response returned",
			challenge:  "",
			expectErr:  ErrBadChallenge,
			expectDone: false,
		},
		{
			scenario:   "Challenge sent with unknown field",
			challenge:  `{"error": "unknown data format"}`,
			expectErr:  ErrFailedServerChallenge,
			expectDone: false,
		},
		{
			scenario:   "Invalid version within challenge",
			challenge:  `{"version": "2022_10_22", "request-id": "pizza sauce"}`,
			expectErr:  ErrFailedServerChallenge,
			expectDone: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.scenario, func(t *testing.T) {
			mskauth := &IAMSASLClient{
				state: serverResponse,
			}

			payload, err := mskauth.Step(tc.challenge)

			assert.ErrorIs(t, err, tc.expectErr, "Must match the expected error in scenario")
			assert.Empty(t, payload, "Must return a blank string")
			assert.Equal(t, tc.expectDone, mskauth.Done(), "Must be in the expected state")
		})
	}

	_, err := new(IAMSASLClient).Step("")
	assert.ErrorIs(t, err, ErrInvalidStateReached, "Must be an invalid step when not set up correctly")

}
