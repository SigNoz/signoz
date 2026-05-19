package o11y

import (
	"net/http"
	"sync"

	"github.com/hanzoai/cloud/pkg/cloud"
	"github.com/hanzoai/zip"
	luxlog "github.com/luxfi/log"
)

// Mount registers Hanzo o11y's HTTP surface under /v1/o11y per HIP-0106.
//
// The o11y runtime (metrics, traces, logs, dashboards, alerts) is heavy:
// telemetry stores, rule manager, websocket attachments, opamp server.
// The standalone cmd/server boot path constructs it all. To keep the
// route layer composable with the unified cloud binary, Mount delegates
// to a handler registered by the runtime via SetHandler.
//
// Routing model:
//
//   - Standalone: cmd/server/server.go constructs *Server, calls
//     o11y.SetHandler(server.PublicHandler()), then cloud.MountAll wires it.
//   - Cloud binary: same SetHandler call, executed from the cloud bootstrapper
//     after o11y.New + app.NewServer.
//   - Until a handler is registered, the routes 503 with a clear error.
//
// All traffic under /v1/o11y is delegated to the registered http.Handler
// via zip.AdaptNetHTTP; the o11y handler internally rewrites /v1/o11y/*
// to /api/* so existing controllers stay untouched (see app.createPublicServer).
func Mount(app *zip.App, deps cloud.Deps) error {
	log := deps.Logger
	if log == nil {
		log = luxlog.New("module", "o11y")
	}
	log.Info("o11y: mounting routes", "prefix", "/v1/o11y")

	app.All("/v1/o11y/*", zip.AdaptNetHTTP(handlerAdapter{}))
	return nil
}

func init() {
	cloud.Register("o11y", 70, func(app any, deps cloud.Deps) error {
		return Mount(app.(*zip.App), deps)
	})
}

// handlerAdapter forwards each request to the registered runtime handler
// or returns 503 if none is set yet.
type handlerAdapter struct{}

func (handlerAdapter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h := getHandler()
	if h == nil {
		http.Error(w, "o11y runtime not initialized", http.StatusServiceUnavailable)
		return
	}
	h.ServeHTTP(w, r)
}

var (
	hmu        sync.RWMutex
	registered http.Handler
)

// SetHandler registers the o11y runtime's public HTTP handler. The
// standalone server calls this after app.NewServer; the unified cloud
// binary calls it after constructing the same runtime in-process.
// Safe for concurrent use; pass nil to unset.
func SetHandler(h http.Handler) {
	hmu.Lock()
	registered = h
	hmu.Unlock()
}

func getHandler() http.Handler {
	hmu.RLock()
	h := registered
	hmu.RUnlock()
	return h
}
