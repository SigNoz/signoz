// Package billingtypes carries the wire-level shapes used by the
// billing handler contract. Community + enterprise share these.
package billingtypes

// PostableProfile is the body for PUT /v2/billing/profiles. The fields
// are intentionally schema-shaped; enterprise implementations enrich
// the semantics.
type PostableProfile struct {
	Plan     string `json:"plan,omitempty"`
	Quantity int64  `json:"quantity,omitempty"`
	Currency string `json:"currency,omitempty"`
}

// PostableHost is the body for PUT /v2/billing/hosts.
type PostableHost struct {
	Hostname string `json:"hostname,omitempty"`
	IPv4     string `json:"ipv4,omitempty"`
	IPv6     string `json:"ipv6,omitempty"`
	Tags     []string `json:"tags,omitempty"`
}

// GettableHost is the response shape for GET /v2/billing/hosts.
type GettableHost struct {
	Hostname    string   `json:"hostname,omitempty"`
	IPv4        string   `json:"ipv4,omitempty"`
	IPv6        string   `json:"ipv6,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	ActiveSince int64    `json:"activeSince,omitempty"`
}
