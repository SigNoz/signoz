package web

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/pkg/http/middleware"
	"go.uber.org/zap"
)

var _ http.Handler = (*Web)(nil)

const (
	indexFileName string = "index.html"
)

type Web struct {
	logger *zap.Logger
	cfg    Config
}

func New(logger *zap.Logger, cfg Config) (*Web, error) {
	if logger == nil {
		return nil, fmt.Errorf("cannot build web, logger is required")
	}

	fi, err := os.Stat(cfg.Directory)
	if err != nil {
		return nil, fmt.Errorf("cannot access web directory: %w", err)
	}

	ok := fi.IsDir()
	if !ok {
		return nil, fmt.Errorf("web directory is not a directory")
	}

	fi, err = os.Stat(filepath.Join(cfg.Directory, indexFileName))
	if err != nil {
		return nil, fmt.Errorf("cannot access %q in web directory: %w", indexFileName, err)
	}

	if os.IsNotExist(err) || fi.IsDir() {
		return nil, fmt.Errorf("%q does not exist", indexFileName)
	}

	return &Web{
		logger: logger.Named("go.signoz.io/pkg/web"),
		cfg:    cfg,
	}, nil
}

func (web *Web) AddToRouter(router *mux.Router) error {
	cache := middleware.NewCache(7 * 24 * time.Hour)
	err := router.PathPrefix(web.cfg.Prefix).
		Handler(
			http.StripPrefix(
				web.cfg.Prefix,
				cache.Wrap(http.HandlerFunc(web.ServeHTTP)),
			),
		).GetError()
	if err != nil {
		return fmt.Errorf("unable to add web to router: %w", err)
	}

	return nil
}

func (web *Web) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	// Join internally call path.Clean to prevent directory traversal
	path := filepath.Join(web.cfg.Directory, req.URL.Path)

	// check whether a file exists or is a directory at the given path
	fi, err := os.Stat(path)
	if os.IsNotExist(err) || fi.IsDir() {
		// file does not exist or path is a directory, serve index.html
		http.ServeFile(rw, req, filepath.Join(web.cfg.Directory, indexFileName))
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
	http.FileServer(http.Dir(web.cfg.Directory)).ServeHTTP(rw, req)
}
