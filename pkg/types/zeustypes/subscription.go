package zeustypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
)

type PostableSubscription struct {
	SuccessURL string `json:"url"`
}

func (postableSubscription *PostableSubscription) UnmarshalJSON(data []byte) error {
	var raw struct {
		SuccessURL string `json:"url"`
	}

	if err := json.Unmarshal(data, &raw); err != nil {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to unmarshal payload")
	}

	if raw.SuccessURL == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "success url cannot be empty")
	}

	postableSubscription.SuccessURL = raw.SuccessURL
	return nil
}

type GettableSubscription struct {
	RedirectURL string `json:"redirectURL"`
}
