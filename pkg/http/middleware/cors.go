package middleware

import (
	"net/http"

	"github.com/rs/cors"
)

type Cors struct {
	cors *cors.Cors
}

func NewCors() *Cors {
	return &Cors{
		cors: cors.New(cors.Options{
			AllowedOrigins: []string{"*"},
			AllowedMethods: []string{"GET", "DELETE", "POST", "PUT", "PATCH", "OPTIONS"},
			AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "cache-control", "X-SIGNOZ-QUERY-ID", "Sec-WebSocket-Protocol"},
		}),
	}
}

func (middleware *Cors) Wrap(next http.Handler) http.Handler {
	return middleware.cors.Handler(next)
}
