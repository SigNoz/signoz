package middleware

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
)

type Comment struct{}

func NewComment() *Comment {
	return &Comment{}
}

func (middleware *Comment) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {

		comment := ctxtypes.CommentFromContext(req.Context())
		comment.Merge(ctxtypes.CommentFromHTTPRequest(req))

		req = req.WithContext(ctxtypes.NewContextWithComment(req.Context(), comment))
		next.ServeHTTP(rw, req)
	})
}
