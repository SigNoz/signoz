package handler

import (
	"net/http"
	"reflect"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"github.com/swaggest/jsonschema-go"
	openapigo "github.com/swaggest/openapi-go"
	"github.com/swaggest/openapi-go/openapi3"
	"github.com/swaggest/rest/openapi"
)

const signozStabilityKey string = "x-signoz-stability"

var (
	StabilityDevelopment = Stability{valuer.NewString("development")}
	StabilityAlpha       = Stability{valuer.NewString("alpha")}
	StabilityBeta        = Stability{valuer.NewString("beta")}
	StabilityStable      = Stability{valuer.NewString("stable")}
)

// Stability is emitted as the x-signoz-stability extension on every operation; unset means alpha.
type Stability struct{ valuer.String }

func (stability Stability) StringValue() string {
	if stability.IsZero() {
		return StabilityAlpha.String.StringValue()
	}

	return stability.String.StringValue()
}

// OpenAPIExample is a named example for an OpenAPI operation.
type OpenAPIExample struct {
	Name        string
	Summary     string
	Description string
	Value       any
}

// Def is the definition of an OpenAPI operation.
type OpenAPIDef struct {
	ID                  string
	Tags                []string
	Summary             string
	Description         string
	Request             any
	RequestQuery        any
	RequestContentType  string
	RequestExamples     []OpenAPIExample
	Response            any
	ResponseContentType string
	SuccessStatusCode   int
	ErrorStatusCodes    []int
	Deprecated          bool
	Stability           Stability
	SecuritySchemes     []OpenAPISecurityScheme
}

type OpenAPISecurityScheme struct {
	Name   string
	Scopes []string
}

// OpenAPICollector is a collector for OpenAPI operations.
type OpenAPICollector struct {
	collector   *openapi.Collector
	stabilities map[operationKey]Stability
}

func NewOpenAPICollector(reflector openapigo.Reflector) *OpenAPICollector {
	c := openapi.NewCollector(reflector)

	return &OpenAPICollector{
		collector:   c,
		stabilities: make(map[operationKey]Stability),
	}
}

func (c *OpenAPICollector) Walker(route *mux.Route, _ *mux.Router, _ []*mux.Route) error {
	httpHandler := route.GetHandler()

	if httpHandler == nil {
		return nil
	}

	path, err := route.GetPathTemplate()
	if err != nil && path == "" {
		// If there is no path, skip the route
		return nil
	}

	methods, err := route.GetMethods()
	if err != nil {
		// If there is no methods, skip the route
		return nil
	}

	if handler, ok := httpHandler.(Handler); ok {
		for _, method := range methods {
			if err := c.collector.CollectOperation(method, path, c.collect(method, path, handler.ServeOpenAPI)); err != nil {
				return err
			}
			if err := c.recordStability(method, path, httpHandler); err != nil {
				return err
			}
		}
		return nil
	}

	return nil
}

// AttachStabilities stamps every operation in spec, so handlers built outside New
// carry the unset stability rather than none.
func (c *OpenAPICollector) AttachStabilities(spec *openapi3.Spec) {
	for path, pathItem := range spec.Paths.MapOfPathItemValues {
		for method, operation := range pathItem.MapOfOperationValues {
			operation.WithMapOfAnythingItem(signozStabilityKey, c.stabilities[operationKey{method: method, path: path}].StringValue())
			pathItem.MapOfOperationValues[method] = operation
		}
	}
}

func (c *OpenAPICollector) collect(method string, path string, serveOpenAPIFunc ServeOpenAPIFunc) func(oc openapigo.OperationContext) error {
	return func(oc openapigo.OperationContext) error {
		// Serve the OpenAPI documentation for the handler
		serveOpenAPIFunc(oc)

		// If the handler has annotations, skip the collection
		if c.collector.HasAnnotation(method, path) {
			return nil
		}

		// Automatically sanitize the method and path
		_, _, pathItems, err := openapigo.SanitizeMethodPath(method, path)
		if err != nil {
			return err
		}

		// If there are path items, add them to the request structure
		if len(pathItems) > 0 {
			req := jsonschema.Struct{}
			for _, p := range pathItems {
				req.Fields = append(req.Fields, jsonschema.Field{
					Name:  "F" + p,
					Tag:   reflect.StructTag(`path:"` + p + `"`),
					Value: "",
				})
			}

			oc.AddReqStructure(req)
		}

		return nil
	}
}

func (c *OpenAPICollector) recordStability(method string, path string, httpHandler http.Handler) error {
	generic, ok := httpHandler.(*handler)
	if !ok {
		return nil
	}

	cleanMethod, cleanPath, _, err := openapigo.SanitizeMethodPath(method, path)
	if err != nil {
		return err
	}

	c.stabilities[operationKey{method: cleanMethod, path: cleanPath}] = generic.openAPIDef.Stability
	return nil
}

type operationKey struct {
	method string
	path   string
}
