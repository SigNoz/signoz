package handler

import (
	"reflect"

	"github.com/gorilla/mux"
	"github.com/swaggest/jsonschema-go"
	openapigo "github.com/swaggest/openapi-go"
	"github.com/swaggest/rest/openapi"
)

type Collector struct {
	Collector *openapi.Collector
}

func NewOpenAPICollector(reflector openapigo.Reflector) *Collector {
	c := openapi.NewCollector(reflector)

	return &Collector{
		Collector: c,
	}
}

// Walker walks route tree and collects OpenAPI information.
func (dc *Collector) Walker(route *mux.Route, _ *mux.Router, _ []*mux.Route) error {
	handler := route.GetHandler()

	if handler == nil {
		return nil
	}

	// Path is critical info, skipping route if there is a problem with path.
	path, err := route.GetPathTemplate()
	if err != nil && path == "" {
		return nil
	}

	methods, err := route.GetMethods()
	if err != nil {
		return nil
	}

	var preparer Handler

	if HandlerAs(handler, &preparer) {
		for _, method := range methods {
			if err := dc.Collector.CollectOperation(method, path, dc.collect(method, path, preparer.ServeOpenAPI)); err != nil {
				return err
			}
		}
	}

	return nil
}

func (dc *Collector) collect(method, path string, preparer ServeOpenAPIFunc) func(oc openapigo.OperationContext) error {
	return func(oc openapigo.OperationContext) error {
		preparer(oc)

		if dc.Collector.HasAnnotation(method, path) {
			return nil
		}

		_, _, pathItems, err := openapigo.SanitizeMethodPath(method, path)
		if err != nil {
			return err
		}

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
