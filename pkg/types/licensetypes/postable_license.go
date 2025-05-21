package licensetypes

import "github.com/SigNoz/signoz/pkg/errors"

type GettableSubscription struct {
	RedirectURL string `json:"redirectURL"`
}

type ActivateLicense struct {
	Key string `json:"key"`
}

func (activate *ActivateLicense) Validate() error {
	if activate.Key == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "license key is needed to activate the license")
	}

	return nil
}

type PostableSubscription struct {
	SuccessURL string `json:"url"`
}

func (subscription *PostableSubscription) Validate() error {
	if subscription.SuccessURL == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "success URL is needed to create a subscription session")
	}

	return nil
}
