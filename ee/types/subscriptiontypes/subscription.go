package subscriptiontypes

type CheckoutRequest struct {
	SuccessURL string `json:"url"`
}

type PortalRequest struct {
	SuccessURL string `json:"url"`
}
