package web

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/mux"
)

const (
	indexPath string = "index.html"
)

type Router struct {
	r   *mux.Router
	cfg Config
}

func NewRouter(cfg Config) (*Router, error) {
	router := &Router{
		r:   mux.NewRouter(),
		cfg: cfg,
	}

	fi, err := os.Stat(cfg.Dir)
	if err != nil {
		return nil, err
	}

	ok := fi.IsDir()
	if !ok {
		return nil, errors.New("web.dir is not a directory")
	}

	fi, err = os.Stat(filepath.Join(cfg.Dir, indexPath))
	if err != nil {
		return nil, err
	}

	if os.IsNotExist(err) || fi.IsDir() {
		return nil, errors.New("index.html is either a directory or does not exist")
	}

	err = router.Register()
	if err != nil {
		return nil, err
	}

	return router, nil
}

func Register(cfg Config, r *mux.Router) error {
	return r.PathPrefix(cfg.BasePath).Handler(http.StripPrefix(cfg.BasePath, cache(serveFunc(cfg)))).GetError()
}

func (router *Router) Handler() http.Handler {
	return router.r
}

func (router *Router) Mux() *mux.Router {
	return router.r
}

func (router *Router) Config() Config {
	return router.cfg
}

func (router *Router) Register() error {
	return Register(router.cfg, router.r)
}

func cache(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		rw.Header().Set("Cache-Control", "max-age=604800") // 7 days
		next.ServeHTTP(rw, req)
	})
}

func serveFunc(cfg Config) http.HandlerFunc {
	return func(rw http.ResponseWriter, req *http.Request) {
		// Join internally call path.Clean to prevent directory traversal
		path := filepath.Join(cfg.Dir, req.URL.Path)

		// check whether a file exists or is a directory at the given path
		fi, err := os.Stat(path)
		if os.IsNotExist(err) || fi.IsDir() {
			// file does not exist or path is a directory, serve index.html
			http.ServeFile(rw, req, filepath.Join(cfg.Dir, indexPath))
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
		http.FileServer(http.Dir(cfg.Dir)).ServeHTTP(rw, req)
	}
}
