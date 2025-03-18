package signozio

type status string

type ValidateLicenseResponse struct {
	Status status                 `json:"status"`
	Data   map[string]interface{} `json:"data"`
}

type CheckoutSessionRedirect struct {
	RedirectURL string `json:"url"`
}
type CheckoutResponse struct {
	Status status                  `json:"status"`
	Data   CheckoutSessionRedirect `json:"data"`
}
