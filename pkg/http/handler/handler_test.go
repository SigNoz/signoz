package handler

import (
	"net/http"
	"testing"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/swaggest/openapi-go"
	"github.com/swaggest/openapi-go/openapi3"
)

type bespokeOpenAPIHandler struct{}

func (bespokeOpenAPIHandler) ServeHTTP(http.ResponseWriter, *http.Request) {}

func (bespokeOpenAPIHandler) ServeOpenAPI(opCtx openapi.OperationContext) {
	opCtx.SetID("Bespoke")
	opCtx.AddRespStructure(nil, openapi.WithHTTPStatus(http.StatusOK))
}

func (bespokeOpenAPIHandler) ResourceDefs() []ResourceDef { return nil }

func (bespokeOpenAPIHandler) Request() any { return nil }

func (bespokeOpenAPIHandler) BindBodyOptions() []binding.BindBodyOption { return nil }

func TestNewPanicsWhenBodyExtractorHasNoPointerRequest(t *testing.T) {
	type body struct{ ID string }
	bodyDef := BasicResourceDef{Resource: coretypes.ResourceRole, Verb: coretypes.VerbRead, ID: coretypes.BodyField(func(req *body) string { return req.ID }), Selector: coretypes.IDSelector}
	pathDef := BasicResourceDef{Resource: coretypes.ResourceRole, Verb: coretypes.VerbRead, ID: coretypes.PathParam("id"), Selector: coretypes.IDSelector}

	testCases := []struct {
		name    string
		request any
		def     ResourceDef
		panics  bool
	}{
		{name: "BodyExtractor_ValueRequest_Panics", request: body{}, def: bodyDef, panics: true},
		{name: "BodyExtractor_NilRequest_Panics", request: nil, def: bodyDef, panics: true},
		{name: "BodyExtractor_PointerRequest_Registers", request: new(body), def: bodyDef, panics: false},
		{name: "PathExtractor_ValueRequest_Registers", request: body{}, def: pathDef, panics: false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			register := func() {
				New(func(http.ResponseWriter, *http.Request) {}, OpenAPIDef{ID: testCase.name, Request: testCase.request}, WithResourceDefs(testCase.def))
			}
			if testCase.panics {
				assert.Panics(t, register)
			} else {
				assert.NotPanics(t, register)
			}
		})
	}
}

func TestAttachStabilities(t *testing.T) {
	router := mux.NewRouter()
	router.Handle("/development", New(func(http.ResponseWriter, *http.Request) {}, OpenAPIDef{ID: "Development", SuccessStatusCode: http.StatusOK, Stability: StabilityDevelopment})).Methods(http.MethodGet)
	router.Handle("/beta/{id}", New(func(http.ResponseWriter, *http.Request) {}, OpenAPIDef{ID: "Beta", SuccessStatusCode: http.StatusOK, Stability: StabilityBeta})).Methods(http.MethodPut)
	router.Handle("/unset", New(func(http.ResponseWriter, *http.Request) {}, OpenAPIDef{ID: "Unset", SuccessStatusCode: http.StatusOK})).Methods(http.MethodGet)
	router.Handle("/bespoke", bespokeOpenAPIHandler{}).Methods(http.MethodGet)

	reflector := openapi3.NewReflector()
	collector := NewOpenAPICollector(reflector)
	require.NoError(t, router.Walk(collector.Walker))
	collector.AttachStabilities(reflector.Spec)

	testCases := []struct {
		subtestName            string
		path                   string
		method                 string
		expectedExtensionValue any
	}{
		{
			subtestName:            "development handler",
			path:                   "/development",
			method:                 "get",
			expectedExtensionValue: "development",
		},
		{
			subtestName:            "beta handler with path parameter",
			path:                   "/beta/{id}",
			method:                 "put",
			expectedExtensionValue: "beta",
		},
		{
			subtestName:            "unset handler defaults to alpha",
			path:                   "/unset",
			method:                 "get",
			expectedExtensionValue: "alpha",
		},
		{
			subtestName:            "handler built outside New defaults to alpha",
			path:                   "/bespoke",
			method:                 "get",
			expectedExtensionValue: "alpha",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.subtestName, func(t *testing.T) {
			operation := reflector.Spec.Paths.MapOfPathItemValues[testCase.path].MapOfOperationValues[testCase.method]
			assert.Equal(t, testCase.expectedExtensionValue, operation.MapOfAnything["x-signoz-stability"])
		})
	}
}
