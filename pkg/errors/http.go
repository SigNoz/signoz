package errors

import (
	"encoding/json"
	"net/url"
	"time"
)

type JSON struct {
	Type              string                    `json:"type,omitempty"`
	Code              string                    `json:"code" required:"true"`
	Message           string                    `json:"message" required:"true"`
	Url               string                    `json:"url,omitempty"`
	Errors            []responseerroradditional `json:"errors,omitempty"`
	Retry             *responseretryjson        `json:"retry,omitempty"`
	Suggestions       []string                  `json:"suggestions,omitempty"`
	InvalidReferences []string                  `json:"invalidReferences,omitempty"`
}

type responseretryjson struct {
	Delay time.Duration `json:"delay"`
}

type responseerroradditional struct {
	Message string `json:"message"`
}

func AsJSON(cause error) *JSON {
	// See if this is an instance of the base error or not
	t, c, m, _, u, a := Unwrapb(cause)

	rea := make([]responseerroradditional, len(a))
	for k, v := range a {
		rea[k] = responseerroradditional{v}
	}

	var retry *responseretryjson
	if r := retryOf(cause); r != nil {
		retry = &responseretryjson{Delay: r.delay}
	}

	return &JSON{
		Type:              t.String(),
		Code:              c.String(),
		Message:           m,
		Url:               u,
		Errors:            rea,
		Retry:             retry,
		Suggestions:       suggestionsOf(cause),
		InvalidReferences: invalidReferencesOf(cause),
	}
}

func AsURLValues(cause error) url.Values {
	// See if this is an instance of the base error or not
	_, c, m, _, u, a := Unwrapb(cause)

	rea := make([]responseerroradditional, len(a))
	for k, v := range a {
		rea[k] = responseerroradditional{v}
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
