package errors

import (
	"encoding/json"
	"net/url"
	"time"
)

type JSON struct {
	Type        string                    `json:"type" required:"true"`
	Code        string                    `json:"code" required:"true"`
	Message     string                    `json:"message" required:"true"`
	Url         string                    `json:"url" required:"true" nullable:"true"`
	Errors      []responseerroradditional `json:"errors" required:"true" nullable:"true"`
	Retry       *responseretryjson        `json:"retry" required:"true" nullable:"true"`
	Suggestions []string                  `json:"suggestions" required:"true" nullable:"true"`
}

type responseretryjson struct {
	Delay time.Duration `json:"delay" required:"true" nullable:"false"`
}

type responseerroradditional struct {
	Message     string   `json:"message" required:"true"`
	Suggestions []string `json:"suggestions" required:"true" nullable:"true"`
}

func AsJSON(cause error) *JSON {
	// See if this is an instance of the base error or not
	t, c, m, _, u, a := Unwrapb(cause)

	var rea []responseerroradditional
	if len(a) > 0 {
		rea = make([]responseerroradditional, len(a))
		for k, v := range a {
			rea[k] = responseerroradditional{Message: v.message, Suggestions: v.suggestions}
		}
	}

	var retry *responseretryjson
	if r := retryOf(cause); r != nil {
		retry = &responseretryjson{Delay: r.delay}
	}

	return &JSON{
		Type:        t.String(),
		Code:        c.String(),
		Message:     m,
		Url:         u,
		Errors:      rea,
		Retry:       retry,
		Suggestions: suggestionsOf(cause),
	}
}

func AsURLValues(cause error) url.Values {
	// See if this is an instance of the base error or not
	_, c, m, _, u, a := Unwrapb(cause)

	// Unlike AsJSON (whose null `errors` honors the OpenAPI nullable contract),
	// this goes into a redirect query param that the frontend JSON.parses and
	// .maps over, so keep a non-nil empty slice -> marshals to "[]", not "null".
	rea := make([]responseerroradditional, len(a))
	for k, v := range a {
		rea[k] = responseerroradditional{Message: v.message, Suggestions: v.suggestions}
	}

	errors, err := json.Marshal(rea)
	if err != nil {
		return url.Values{
			"code":    {c.String()},
			"message": {m},
			"url":     {u},
		}
	}

	return url.Values{
		"code":    {c.String()},
		"message": {m},
		"url":     {u},
		"errors":  {string(errors)},
	}
}
