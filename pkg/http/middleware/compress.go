package middleware

import (
	"net/http"

	gorillahandlers "github.com/gorilla/handlers"
)

type Compress struct{}

func NewCompress() *Compress {
	return &Compress{}
}

func (middleware *Compress) Wrap(next http.Handler) http.Handler {
	return gorillahandlers.CompressHandler(next)
}
