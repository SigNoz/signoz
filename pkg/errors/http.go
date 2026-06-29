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
	Errors      []responseerroradditional `json:"errors" required:"true" nullable:"false"`
	Retry       *responseretryjson        `json:"retry" required:"true" nullable:"true"`
	Suggestions []string                  `json:"suggestions" required:"true" nullable:"false"`
}

type responseretryjson struct {
	Delay time.Duration `json:"delay" required:"true" nullable:"false"`
}

type responseerroradditional struct {
	Message     string   `json:"message" required:"true"`
	Suggestions []string `json:"suggestions" required:"true" nullable:"false"`
}

func AsJSON(cause error) *JSON {
	// See if this is an instance of the base error or not
	t, c, m, _, u, a := Unwrapb(cause)

	rea := responseAdditionals(a)

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
		Suggestions: nonNilStrings(suggestionsOf(cause)),
	}
}

func AsURLValues(cause error) url.Values {
	// See if this is an instance of the base error or not
	_, c, m, _, u, a := Unwrapb(cause)

	rea := responseAdditionals(a)

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

func responseAdditionals(a []additional) []responseerroradditional {
	rea := make([]responseerroradditional, len(a))
	for k, v := range a {
		rea[k] = responseerroradditional{Message: v.message, Suggestions: nonNilStrings(v.suggestions)}
	}

	return rea
}

func nonNilStrings(s []string) []string {
	if s == nil {
		return []string{}
	}

	return s
}
