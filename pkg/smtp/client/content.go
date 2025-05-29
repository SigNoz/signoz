package client

import "github.com/SigNoz/signoz/pkg/valuer"

var (
	ContentTypeText = ContentType{valuer.NewString("text/plain")}
	ContentTypeHTML = ContentType{valuer.NewString("text/html")}
)

type ContentType struct{ valuer.String }
