package router

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/http/middleware"
	"go.signoz.io/signoz/pkg/web"
)

var _ web.Web = (*router)(nil)

const (
	indexFileName string = "index.html"
)

type router struct {
	config web.Config
}

func NewFactory() factory.ProviderFactory[web.Web, web.Config] {
	return factory.NewProviderFactory(factory.MustNewName("router"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config web.Config) (web.Web, error) {
	if settings.ZapLogger == nil {
		return nil, fmt.Errorf("cannot build web, logger is required")
	}

	fi, err := os.Stat(config.Directory)
	if err != nil {
		return nil, fmt.Errorf("cannot access web directory: %w", err)
	}

	ok := fi.IsDir()
	if !ok {
		return nil, fmt.Errorf("web directory is not a directory")
	}

	fi, err = os.Stat(filepath.Join(config.Directory, indexFileName))
	if err != nil {
		return nil, fmt.Errorf("cannot access %q in web directory: %w", indexFileName, err)
	}

	if os.IsNotExist(err) || fi.IsDir() {
		return nil, fmt.Errorf("%q does not exist", indexFileName)
	}

	return &router{
		config: config,
	}, nil
}

func (web *router) AddToRouter(router *mux.Router) error {
	cache := middleware.NewCache(7 * 24 * time.Hour)
	err := router.PathPrefix(web.config.Prefix).
		Handler(
			http.StripPrefix(
				web.config.Prefix,
				cache.Wrap(http.HandlerFunc(web.ServeHTTP)),
			),
		).GetError()
	if err != nil {
		return fmt.Errorf("unable to add web to router: %w", err)
	}

	return nil
}

func (web *router) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	// Join internally call path.Clean to prevent directory traversal
	path := filepath.Join(web.config.Directory, req.URL.Path)

	// check whether a file exists or is a directory at the given path
	fi, err := os.Stat(path)
	if os.IsNotExist(err) || fi.IsDir() {
		// file does not exist or path is a directory, serve index.html
		http.ServeFile(rw, req, filepath.Join(web.config.Directory, indexFileName))
		return
	}

	if err != nil {
		// if we got an error (that wasn't that the file doesn't exist) stating the
		// file, return a 500 internal server error and stop
		// TODO: Put down a crash html page here
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	// otherwise, use http.FileServer to serve the static file
	http.FileServer(http.Dir(web.config.Directory)).ServeHTTP(rw, req)
}
