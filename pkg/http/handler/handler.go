package handler

import (
	"net/http"
	"reflect"

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
	def         Def
}

func New(handlerFunc http.HandlerFunc, def Def) Handler {
	return &handler{
		handlerFunc: handlerFunc,
		def:         def,
	}
}

func (handler *handler) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	handler.handlerFunc.ServeHTTP(rw, req)
}

func (handler *handler) ServeOpenAPI(opCtx openapi.OperationContext) {
	opCtx.SetTags(handler.def.Tags...)
	opCtx.SetSummary(handler.def.Summary)
	opCtx.SetDescription(handler.def.Description)
	// opCtx.SetID(handler.def.ID)

	opCtx.AddReqStructure(handler.def.Request)

	// Add success response
	opCtx.AddRespStructure(
		render.SuccessResponse{Status: render.StatusSuccess.String(), Data: handler.def.Response},
		openapi.WithContentType("application/json"),
		openapi.WithHTTPStatus(handler.def.SuccessStatusCode),
	)

	// Add error responses
	for _, statusCode := range handler.def.ErrorStatusCodes {
		opCtx.AddRespStructure(
			render.ErrorResponse{Status: render.StatusError.String(), Error: &errors.JSON{}},
			openapi.WithContentType("application/json"),
			openapi.WithHTTPStatus(statusCode),
		)
	}
}

func HandlerAs(handler http.Handler, target interface{}) bool {
	if target == nil {
		return false
	}

	val := reflect.ValueOf(target)
	typ := val.Type()

	if typ.Kind() != reflect.Ptr || val.IsNil() {
		return false
	}

	if e := typ.Elem(); e.Kind() != reflect.Interface {
		return false
	}

	targetType := typ.Elem()
	if reflect.TypeOf(handler).AssignableTo(targetType) {
		val.Elem().Set(reflect.ValueOf(handler))

		return true
	}

	return false
}
