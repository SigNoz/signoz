package config

import (
	"fmt"
	"regexp"
)

var (
	// uriRegex is a regex that matches the URI format. It complies with the URI definition defined at https://datatracker.ietf.org/doc/html/rfc3986.
	// The format is "<scheme>:<value>".
	uriRegex = regexp.MustCompile(`(?s:^(?P<Scheme>[A-Za-z][A-Za-z0-9+.-]+):(?P<Value>.*)$)`)
)

type Uri struct {
	scheme string
	value  string
}

func NewUri(input string) (Uri, error) {
	submatches := uriRegex.FindStringSubmatch(input)

	if len(submatches) != 3 {
		return Uri{}, fmt.Errorf("invalid uri: %q", input)
	}
	return Uri{
		scheme: submatches[1],
		value:  submatches[2],
	}, nil
}

func MustNewUri(input string) Uri {
	uri, err := NewUri(input)
	if err != nil {
		panic(err)
	}

	return uri
}

func (uri Uri) Scheme() string {
	return uri.scheme
}

func (uri Uri) Value() string {
	return uri.value
}
