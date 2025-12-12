package handler

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/swaggest/openapi-go"
)

type ServeOpenAPIFunc func(openapi.OperationContext)

type Handler interface {
	http.Handler
	ServeOpenAPI(openapi.OperationContext)
}

type handler struct {
	handlerFunc http.HandlerFunc
	openAPIDef  OpenAPIDef
}

func New(handlerFunc http.HandlerFunc, openAPIDef OpenAPIDef) Handler {
	return &handler{
		handlerFunc: handlerFunc,
		openAPIDef:  openAPIDef,
	}
}

func (handler *handler) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	handler.handlerFunc.ServeHTTP(rw, req)
}

func (handler *handler) ServeOpenAPI(opCtx openapi.OperationContext) {
	// Add meta information
	opCtx.SetID(handler.openAPIDef.ID)
	opCtx.SetTags(handler.openAPIDef.Tags...)
	opCtx.SetSummary(handler.openAPIDef.Summary)
	opCtx.SetDescription(handler.openAPIDef.Description)

	// Add request structure
	opCtx.AddReqStructure(handler.openAPIDef.Request, openapi.WithContentType(handler.openAPIDef.RequestContentType))

	// Add success response
	opCtx.AddRespStructure(
		render.SuccessResponse{Status: render.StatusSuccess.String(), Data: handler.openAPIDef.Response},
		openapi.WithContentType(handler.openAPIDef.ResponseContentType),
		openapi.WithHTTPStatus(handler.openAPIDef.SuccessStatusCode),
	)

	// Add error responses
	for _, statusCode := range handler.openAPIDef.ErrorStatusCodes {
		opCtx.AddRespStructure(
			render.ErrorResponse{Status: render.StatusError.String(), Error: &errors.JSON{}},
			openapi.WithContentType("application/json"),
			openapi.WithHTTPStatus(statusCode),
		)
	}
}
