package handler

import (
	"net/http"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/swaggest/openapi-go"
	"github.com/swaggest/openapi-go/openapi3"
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
	// Remove duplicate error status codes
	openAPIDef.ErrorStatusCodes = slices.DeleteFunc(openAPIDef.ErrorStatusCodes, func(statusCode int) bool {
		return statusCode == http.StatusUnauthorized || statusCode == http.StatusForbidden || statusCode == http.StatusInternalServerError
	})

	// Add internal server error
	openAPIDef.ErrorStatusCodes = append(openAPIDef.ErrorStatusCodes, http.StatusInternalServerError)

	// Add unauthorized and forbidden status codes
	if len(openAPIDef.SecuritySchemes) > 0 {
		openAPIDef.ErrorStatusCodes = append(openAPIDef.ErrorStatusCodes, http.StatusUnauthorized, http.StatusForbidden)
	}

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
	opCtx.SetIsDeprecated(handler.openAPIDef.Deprecated)

	// Add security schemes
	for _, securityScheme := range handler.openAPIDef.SecuritySchemes {
		opCtx.AddSecurity(securityScheme.Name, securityScheme.Scopes...)
	}

	// Add request structure
	reqOpts := []openapi.ContentOption{openapi.WithContentType(handler.openAPIDef.RequestContentType)}
	if len(handler.openAPIDef.RequestExamples) > 0 {
		reqOpts = append(reqOpts, openapi.WithCustomize(func(cor openapi.ContentOrReference) {
			rbOrRef, ok := cor.(*openapi3.RequestBodyOrRef)
			if !ok || rbOrRef.RequestBody == nil {
				return
			}
			ct := handler.openAPIDef.RequestContentType
			if ct == "" {
				ct = "application/json"
			}
			mt, exists := rbOrRef.RequestBody.Content[ct]
			if !exists {
				return
			}
			if mt.Examples == nil {
				mt.Examples = make(map[string]openapi3.ExampleOrRef)
			}
			for _, ex := range handler.openAPIDef.RequestExamples {
				val := ex.Value
				oaExample := openapi3.Example{Value: &val}
				if ex.Summary != "" {
					oaExample.WithSummary(ex.Summary)
				}
				if ex.Description != "" {
					oaExample.WithDescription(ex.Description)
				}
				mt.Examples[ex.Name] = openapi3.ExampleOrRef{Example: &oaExample}
			}
			rbOrRef.RequestBody.Content[ct] = mt
		}))
	}
	opCtx.AddReqStructure(handler.openAPIDef.Request, reqOpts...)

	// Add request query structure
	opCtx.AddReqStructure(handler.openAPIDef.RequestQuery)

	// Add success response
	if handler.openAPIDef.Response != nil {
		opCtx.AddRespStructure(
			render.SuccessResponse{Status: render.StatusSuccess.String(), Data: handler.openAPIDef.Response},
			openapi.WithContentType(handler.openAPIDef.ResponseContentType),
			openapi.WithHTTPStatus(handler.openAPIDef.SuccessStatusCode),
		)
	} else {
		opCtx.AddRespStructure(
			nil,
			openapi.WithContentType(handler.openAPIDef.ResponseContentType),
			openapi.WithHTTPStatus(handler.openAPIDef.SuccessStatusCode),
		)
	}

	// Add error responses
	for _, statusCode := range handler.openAPIDef.ErrorStatusCodes {
		opCtx.AddRespStructure(
			render.ErrorResponse{Status: render.StatusError.String(), Error: &errors.JSON{}},
			openapi.WithContentType("application/json"),
			openapi.WithHTTPStatus(statusCode),
		)
	}

}
