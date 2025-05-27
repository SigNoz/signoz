package licensetypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
)

type GettableSubscription struct {
	RedirectURL string `json:"redirectURL"`
}

type PostableSubscription struct {
	SuccessURL string `json:"url"`
}

func (p *PostableSubscription) UnmarshalJSON(data []byte) error {
	var postableSubscription struct {
		SuccessURL string `json:"url"`
	}

	err := json.Unmarshal(data, &postableSubscription)
	if err != nil {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to unmarshal payload")
	}

	if postableSubscription.SuccessURL == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "success url cannot be empty")
	}

	p.SuccessURL = postableSubscription.SuccessURL
	return nil
}
