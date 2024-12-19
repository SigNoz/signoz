package signozio

type status string

type ValidateLicenseResponse struct {
	Status status                 `json:"status"`
	Data   map[string]interface{} `json:"data"`
}
