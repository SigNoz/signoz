package routerweb

import (
	"context"
	"encoding/json"
	"html/template"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/gorilla/mux"
)

type provider struct {
	config        web.Config
	indexContents []byte
	fileHandler   http.Handler
}

func NewFactory(globalConfig global.Config) factory.ProviderFactory[web.Web, web.Config] {
	return factory.NewProviderFactory(factory.MustNewName("router"), func(ctx context.Context, settings factory.ProviderSettings, config web.Config) (web.Web, error) {
		return New(ctx, settings, config, globalConfig)
	})
}

func New(ctx context.Context, settings factory.ProviderSettings, config web.Config, globalConfig global.Config) (web.Web, error) {
	fi, err := os.Stat(config.Directory)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "cannot access web directory")
	}

	if !fi.IsDir() {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "web directory is not a directory")
	}

	indexPath := filepath.Join(config.Directory, config.Index)
	raw, err := os.ReadFile(indexPath)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "cannot read %q in web directory", config.Index)
	}

	webSettings := web.NewSettings(config)
	settingsJSON, err := json.Marshal(webSettings)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "cannot marshal web settings to JSON")
	}

	logger := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/web/routerweb").Logger()
	indexContents := web.NewIndex(ctx, logger, config.Index, raw, web.TemplateData{
		BaseHref: globalConfig.ExternalPathTrailing(),
		Settings: template.JS(settingsJSON),
	})

	return &provider{
		config:        config,
		indexContents: indexContents,
		fileHandler:   http.FileServer(http.Dir(config.Directory)),
	}, nil
}

func (provider *provider) AddToRouter(router *mux.Router) error {
	// Capture endpoints before the catch-all: mux can lose method mismatches when subrouters fall through.
	routesByMethod := make(map[string][]*mux.Route)
	if err := router.Walk(func(route *mux.Route, _ *mux.Router, _ []*mux.Route) error {
		if route.GetHandler() == nil {
			return nil
		}
		methods, err := route.GetMethods()
		if err != nil {
			return nil
		}
		for _, method := range methods {
			routesByMethod[method] = append(routesByMethod[method], route)
		}
		return nil
	}); err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "unable to walk routes")
	}

	fallback := http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		probe := *req
		var allowedMethods []string
		for method, routes := range routesByMethod {
			probe.Method = method
			for _, route := range routes {
				if route.Match(&probe, &mux.RouteMatch{}) {
					allowedMethods = append(allowedMethods, method)
					break
				}
			}
		}
		if len(allowedMethods) > 0 {
			slices.Sort(allowedMethods)
			rw.Header().Set("Allow", strings.Join(allowedMethods, ", "))
			render.Error(rw, errors.NewMethodNotAllowedf(errors.CodeMethodNotAllowed, "method not allowed"))
			return
		}
		if req.URL.Path == "/api" || strings.HasPrefix(req.URL.Path, "/api/") {
			render.Error(rw, errors.NewNotFoundf(errors.CodeNotFound, "API endpoint not found"))
			return
		}
		provider.ServeHTTP(rw, req)
	})

	cache := middleware.NewCache(0)
	err := router.PathPrefix("/").
		Handler(
			cache.Wrap(fallback),
		).GetError()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "unable to add web to router")
	}

	return nil
}

func (provider *provider) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	// Join internally call path.Clean to prevent directory traversal
	path := filepath.Join(provider.config.Directory, req.URL.Path)

	// check whether a file exists or is a directory at the given path
	fi, err := os.Stat(path)
	if err != nil {
		// if the file doesn't exist, serve index.html
		if os.IsNotExist(err) {
			provider.serveIndex(rw)
			return
		}

		// if we got an error (that wasn't that the file doesn't exist) stating the
		// file, return a 500 internal server error and stop
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	if fi.IsDir() {
		// path is a directory, serve index.html
		provider.serveIndex(rw)
		return
	}

	// otherwise, use http.FileServer to serve the static file
	provider.fileHandler.ServeHTTP(rw, req)
}

func (provider *provider) serveIndex(rw http.ResponseWriter) {
	rw.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = rw.Write(provider.indexContents)
}
