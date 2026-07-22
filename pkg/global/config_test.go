package global

import (
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestExternalPath(t *testing.T) {
	testCases := []struct {
		name     string
		config   Config
		expected string
	}{
		{
			name:     "NilURL",
			config:   Config{ExternalURL: nil},
			expected: "",
		},
		{
			name:     "EmptyPath",
			config:   Config{ExternalURL: &url.URL{Scheme: "https", Host: "example.com", Path: ""}},
			expected: "",
		},
		{
			name:     "RootPath",
			config:   Config{ExternalURL: &url.URL{Scheme: "https", Host: "example.com", Path: "/"}},
			expected: "",
		},
		{
			name:     "SingleSegment",
			config:   Config{ExternalURL: &url.URL{Scheme: "https", Host: "example.com", Path: "/signoz"}},
			expected: "/signoz",
		},
		{
			name:     "TrailingSlash",
			config:   Config{ExternalURL: &url.URL{Scheme: "https", Host: "example.com", Path: "/signoz/"}},
			expected: "/signoz",
		},
		{
			name:     "MultiSegment",
			config:   Config{ExternalURL: &url.URL{Scheme: "https", Host: "example.com", Path: "/a/b/c"}},
			expected: "/a/b/c",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.expected, tc.config.ExternalPath())
		})
	}
}

func TestExternalPathTrailing(t *testing.T) {
	testCases := []struct {
		name     string
		config   Config
		expected string
	}{
		{
			name:     "NilURL",
			config:   Config{ExternalURL: nil},
			expected: "/",
		},
		{
			name:     "EmptyPath",
			config:   Config{ExternalURL: &url.URL{Path: ""}},
			expected: "/",
		},
		{
			name:     "RootPath",
			config:   Config{ExternalURL: &url.URL{Path: "/"}},
			expected: "/",
		},
		{
			name:     "SingleSegment",
			config:   Config{ExternalURL: &url.URL{Path: "/signoz"}},
			expected: "/signoz/",
		},
		{
			name:     "MultiSegment",
			config:   Config{ExternalURL: &url.URL{Path: "/a/b/c"}},
			expected: "/a/b/c/",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.expected, tc.config.ExternalPathTrailing())
		})
	}
}

func TestValidate(t *testing.T) {
	testCases := []struct {
		name   string
		config Config
		fail   bool
	}{
		{
			name:   "NilURL",
			config: Config{ExternalURL: nil},
			fail:   false,
		},
		{
			name:   "EmptyPath",
			config: Config{ExternalURL: &url.URL{Path: ""}},
			fail:   false,
		},
		{
			name:   "RootPath",
			config: Config{ExternalURL: &url.URL{Path: "/"}},
			fail:   false,
		},
		{
			name:   "ValidPath",
			config: Config{ExternalURL: &url.URL{Path: "/signoz"}},
			fail:   false,
		},
		{
			name:   "NoLeadingSlash",
			config: Config{ExternalURL: &url.URL{Path: "signoz"}},
			fail:   true,
		},
		{
			name:   "ValidAllowedOrigin",
			config: Config{AllowedOrigins: []*url.URL{{Scheme: "https", Host: "signoz.example.com"}}},
			fail:   false,
		},
		{
			name:   "AllowedOriginWithoutScheme",
			config: Config{AllowedOrigins: []*url.URL{{Host: "signoz.example.com"}}},
			fail:   true,
		},
		{
			name:   "AllowedOriginWithoutHost",
			config: Config{AllowedOrigins: []*url.URL{{Scheme: "https"}}},
			fail:   true,
		},
		{
			name:   "AllowedOriginWithPath",
			config: Config{AllowedOrigins: []*url.URL{{Scheme: "https", Host: "signoz.example.com", Path: "/login"}}},
			fail:   true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.config.Validate()
			if tc.fail {
				assert.Error(t, err)
				return
			}

			assert.NoError(t, err)
		})
	}
}

func TestIsOriginAllowedWhenUnconfigured(t *testing.T) {
	testCases := []struct {
		name   string
		config Config
	}{
		{
			name:   "Empty",
			config: Config{},
		},
		{
			name:   "ExternalURLDoesNotActivateValidation",
			config: Config{ExternalURL: &url.URL{Scheme: "https", Host: "signoz.example.com"}},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			u, err := url.Parse("https://anything.example.com/login")
			assert.NoError(t, err)
			assert.True(t, tc.config.IsOriginAllowed(u))
		})
	}
}

func TestIsOriginAllowed(t *testing.T) {
	config := Config{
		AllowedOrigins: []*url.URL{
			{Scheme: "https", Host: "signoz.example.com"},
			{Scheme: "http", Host: "localhost:3301"},
		},
	}

	testCases := []struct {
		name     string
		input    string
		expected bool
	}{
		{
			name:     "ConfiguredOrigin",
			input:    "https://signoz.example.com/login",
			expected: true,
		},
		{
			name:     "ConfiguredOriginWithQuery",
			input:    "http://localhost:3301/login?next=/dashboards",
			expected: true,
		},
		{
			name:     "CaseInsensitiveHost",
			input:    "https://SigNoz.Example.Com/login",
			expected: true,
		},
		{
			name:     "UnknownHost",
			input:    "https://attacker.example.com/login",
			expected: false,
		},
		{
			name:     "SchemeMismatch",
			input:    "http://signoz.example.com/login",
			expected: false,
		},
		{
			name:     "PortMismatch",
			input:    "https://signoz.example.com:8443/login",
			expected: false,
		},
		{
			name:     "SuffixConfusion",
			input:    "https://evilsignoz.example.com/login",
			expected: false,
		},
		{
			name:     "UserInfoConfusion",
			input:    "https://signoz.example.com@attacker.example.com/login",
			expected: false,
		},
		{
			name:     "SchemeRelative",
			input:    "//attacker.example.com/login",
			expected: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			u, err := url.Parse(tc.input)
			assert.NoError(t, err)
			assert.Equal(t, tc.expected, config.IsOriginAllowed(u))
		})
	}
}
