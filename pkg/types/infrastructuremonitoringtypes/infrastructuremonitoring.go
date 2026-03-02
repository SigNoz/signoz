package infrastructuremonitoringtypes

// HealthCheckResponse represents the response structure for the infrastructure monitoring health check API.
type HealthCheckResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}
