package services

import (
	"context"
	"net/http"
)

// Handler exposes HTTP handler for services_qbv5
type Handler interface {
	Get(http.ResponseWriter, *http.Request)
}

// Module represents the services QBv5 module interface
type Module interface {
	Get(ctx context.Context, orgID string, req *Request) ([]*ResponseItem, error)
}
