package handler

import (
	"reflect"

	"github.com/gorilla/mux"
	"github.com/swaggest/jsonschema-go"
	openapigo "github.com/swaggest/openapi-go"
	"github.com/swaggest/rest/openapi"
)

// Def is the definition of an OpenAPI operation
type OpenAPIDef struct {
	ID                  string
	Tags                []string
	Summary             string
	Description         string
	Request             any
	RequestContentType  string
	Response            any
	ResponseContentType string
	SuccessStatusCode   int
	ErrorStatusCodes    []int
	Deprecated          bool
	SecuritySchemes     []OpenAPISecurityScheme
}

type OpenAPISecurityScheme struct {
	Name   string
	Scopes []string
}

// Collector is a collector for OpenAPI operations
type OpenAPICollector struct {
	collector *openapi.Collector
}

func NewOpenAPICollector(reflector openapigo.Reflector) *OpenAPICollector {
	c := openapi.NewCollector(reflector)

	return &OpenAPICollector{
		collector: c,
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
		}
		return nil
	}

	return nil
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
