package routerweb

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"html/template"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/gorilla/mux"
)

const (
	assetsPathPrefix      = "/assets/"
	immutableCacheControl = "public, max-age=31536000, immutable"
)

type provider struct {
	config        web.Config
	indexContents []byte
	indexETag     string
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
		indexETag:     indexETag(indexContents),
		fileHandler:   newPrecompressedHandler(http.Dir(config.Directory), config.Index),
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

	// files under /assets/ are content-hashed, so their URL changes with their content
	if strings.HasPrefix(req.URL.Path, assetsPathPrefix) {
		rw.Header().Set("Cache-Control", immutableCacheControl)
	}

	// otherwise, use http.FileServer to serve the static file
	provider.fileHandler.ServeHTTP(rw, req)
}

// The index is rendered once at startup, so a hash of it is a strong validator for the life of the process.
func (provider *provider) serveIndex(rw http.ResponseWriter, req *http.Request) {
	rw.Header().Set("Content-Type", "text/html; charset=utf-8")
	rw.Header().Set("ETag", provider.indexETag)
	http.ServeContent(rw, req, "", time.Time{}, bytes.NewReader(provider.indexContents))
}

func indexETag(contents []byte) string {
	sum := sha256.Sum256(contents)
	return `"` + hex.EncodeToString(sum[:16]) + `"`
}
