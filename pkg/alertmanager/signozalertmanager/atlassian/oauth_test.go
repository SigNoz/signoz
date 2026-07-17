// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package atlassian

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/alertmanager"
)

func TestAllowedOpenerOrigin(t *testing.T) {
	oauth := alertmanager.AtlassianOAuthConfig{
		RedirectURI: "https://signoz.example.com/api/v1/channels/atlassian/oauth/callback",
	}

	cases := []struct {
		name         string
		openerOrigin string
		want         string
	}{
		{"matching origin is honored", "https://signoz.example.com", "https://signoz.example.com"},
		{"attacker origin is rejected", "https://evil.com", ""},
		{"scheme mismatch is rejected", "http://signoz.example.com", ""},
		{"port mismatch is rejected", "https://signoz.example.com:8443", ""},
		{"wildcard is rejected", "*", ""},
		{"empty is rejected", "", ""},
		{"value with a path is rejected", "https://signoz.example.com/foo", ""},
		{"malformed is rejected", "://nope", ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := allowedOpenerOrigin(oauth, tc.openerOrigin); got != tc.want {
				t.Fatalf("allowedOpenerOrigin(%q) = %q, want %q", tc.openerOrigin, got, tc.want)
			}
		})
	}
}

func TestAllowedOpenerOriginUnconfiguredRedirect(t *testing.T) {
	oauth := alertmanager.AtlassianOAuthConfig{}
	if got := allowedOpenerOrigin(oauth, "https://signoz.example.com"); got != "" {
		t.Fatalf("allowedOpenerOrigin with empty redirect = %q, want empty", got)
	}
}

func TestAllowedOpenerOriginAllowlist(t *testing.T) {
	oauth := alertmanager.AtlassianOAuthConfig{
		RedirectURI:          "http://localhost:8080/api/v1/channels/atlassian/oauth/callback",
		AllowedOpenerOrigins: []string{"http://localhost:3301"},
	}

	cases := []struct {
		name         string
		openerOrigin string
		want         string
	}{
		{"redirect origin still honored", "http://localhost:8080", "http://localhost:8080"},
		{"allowlisted origin is honored", "http://localhost:3301", "http://localhost:3301"},
		{"origin outside both is rejected", "http://localhost:9999", ""},
		{"attacker origin is rejected", "https://evil.com", ""},
		{"allowlisted with a path is rejected", "http://localhost:3301/foo", ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := allowedOpenerOrigin(oauth, tc.openerOrigin); got != tc.want {
				t.Fatalf("allowedOpenerOrigin(%q) = %q, want %q", tc.openerOrigin, got, tc.want)
			}
		})
	}
}
