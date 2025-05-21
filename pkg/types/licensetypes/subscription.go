package licensetypes

type PostableSubscription struct {
	SuccessURL string `json:"url"`
}

type GettableSubscription struct {
	RedirectURL string `json:"redirectURL"`
}
