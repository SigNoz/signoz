package licensetypes

type ActivateLicense struct {
	Key string `json:"key"`
}

type CheckoutRequest struct {
	SuccessURL string `json:"url"`
}

type PortalRequest struct {
	SuccessURL string `json:"url"`
}
