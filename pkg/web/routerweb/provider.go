package routerweb

import (
	"context"
	"net/http"
	"os"
	"path/filepath"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/gorilla/mux"
)

const (
	indexFileName string = "index.html"
)

type provider struct {
	config web.Config
}

func NewFactory() factory.ProviderFactory[web.Web, web.Config] {
	return factory.NewProviderFactory(factory.MustNewName("router"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config web.Config) (web.Web, error) {
	fi, err := os.Stat(config.Directory)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "cannot access web directory")
	}

	ok := fi.IsDir()
	if !ok {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "web directory is not a directory")
	}

	fi, err = os.Stat(filepath.Join(config.Directory, indexFileName))
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "cannot access %q in web directory", indexFileName)
	}

	if os.IsNotExist(err) || fi.IsDir() {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "%q does not exist", indexFileName)
	}

	return &provider{
		config: config,
	}, nil
}

func (provider *provider) AddToRouter(router *mux.Router) error {
	cache := middleware.NewCache(0)
	err := router.PathPrefix(provider.config.Prefix).
		Handler(
			http.StripPrefix(
				provider.config.Prefix,
				cache.Wrap(http.HandlerFunc(provider.ServeHTTP)),
			),
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
			provider.serveIndex(rw, req)
			return
		}

		// if we got an error (that wasn't that the file doesn't exist) stating the
		// file, return a 500 internal server error and stop
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	if fi.IsDir() {
		// path is a directory, serve index.html
		provider.serveIndex(rw, req)
		return
	}

	// otherwise, use http.FileServer to serve the static file
	http.FileServer(http.Dir(provider.config.Directory)).ServeHTTP(rw, req)
}

// serveIndex serves index.html as the SPA catch-all with no-store caching.
// Unlike static assets which benefit from conditional caching (no-cache),
// the catch-all must use no-store to prevent browsers from caching HTML
// responses for paths that may correspond to API routes or other non-SPA
// endpoints. Without no-store, a cached HTML response can poison the
// browser cache during version upgrades, causing API calls to silently
// receive HTML instead of JSON. See https://github.com/SigNoz/signoz/issues/10209
func (provider *provider) serveIndex(rw http.ResponseWriter, req *http.Request) {
	rw.Header().Set("Cache-Control", "no-store")
	http.ServeFile(rw, req, filepath.Join(provider.config.Directory, indexFileName))
}
