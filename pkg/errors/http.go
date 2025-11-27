package errors

import (
	"encoding/json"
	"net/url"
)

type JSON struct {
	Code    string                    `json:"code"`
	Message string                    `json:"message"`
	Url     string                    `json:"url,omitempty"`
	Errors  []responseerroradditional `json:"errors,omitempty"`
}

type responseerroradditional struct {
	Message string `json:"message"`
}

func AsJSON(cause error) *JSON {
	// See if this is an instance of the base error or not
	_, c, m, cause, u, a := Unwrapb(cause)

	rea := make([]responseerroradditional, len(a))
	for k, v := range a {
		rea[k] = responseerroradditional{v}
	}

	// add the underlying error message
	if cause != nil {
		rea = append(rea, responseerroradditional{Message: cause.Error()})
	}

	return &JSON{
		Code:    c.String(),
		Message: m,
		Url:     u,
		Errors:  rea,
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
