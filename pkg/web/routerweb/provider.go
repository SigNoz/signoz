package routerweb

import (
	"context"
	"net/http"
	"os"
	"path/filepath"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/http/middleware"
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

	logger := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/web/routerweb").Logger()
	indexContents := web.NewIndex(ctx, logger, config.Index, raw, web.TemplateData{BaseHref: globalConfig.ExternalPathTrailing()})

	return &provider{
		config:        config,
		indexContents: indexContents,
		fileHandler:   http.FileServer(http.Dir(config.Directory)),
	}, nil
}

func (provider *provider) AddToRouter(router *mux.Router) error {
	cache := middleware.NewCache(0)
	err := router.PathPrefix("/").
		Handler(
			cache.Wrap(http.HandlerFunc(provider.ServeHTTP)),
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
