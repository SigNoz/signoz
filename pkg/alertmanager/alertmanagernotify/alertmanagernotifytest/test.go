package test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/require"

	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

// RetryTests returns a map of HTTP status codes to bool indicating whether the notifier should retry or not.
func RetryTests(retryCodes []int) map[int]bool {
	tests := map[int]bool{
		// 1xx
		http.StatusContinue:           false,
		http.StatusSwitchingProtocols: false,
		http.StatusProcessing:         false,

		// 2xx
		http.StatusOK:                   false,
		http.StatusCreated:              false,
		http.StatusAccepted:             false,
		http.StatusNonAuthoritativeInfo: false,
		http.StatusNoContent:            false,
		http.StatusResetContent:         false,
		http.StatusPartialContent:       false,
		http.StatusMultiStatus:          false,
		http.StatusAlreadyReported:      false,
		http.StatusIMUsed:               false,

		// 3xx
		http.StatusMultipleChoices:   false,
		http.StatusMovedPermanently:  false,
		http.StatusFound:             false,
		http.StatusSeeOther:          false,
		http.StatusNotModified:       false,
		http.StatusUseProxy:          false,
		http.StatusTemporaryRedirect: false,
		http.StatusPermanentRedirect: false,

		// 4xx
		http.StatusBadRequest:                   false,
		http.StatusUnauthorized:                 false,
		http.StatusPaymentRequired:              false,
		http.StatusForbidden:                    false,
		http.StatusNotFound:                     false,
		http.StatusMethodNotAllowed:             false,
		http.StatusNotAcceptable:                false,
		http.StatusProxyAuthRequired:            false,
		http.StatusRequestTimeout:               false,
		http.StatusConflict:                     false,
		http.StatusGone:                         false,
		http.StatusLengthRequired:               false,
		http.StatusPreconditionFailed:           false,
		http.StatusRequestEntityTooLarge:        false,
		http.StatusRequestURITooLong:            false,
		http.StatusUnsupportedMediaType:         false,
		http.StatusRequestedRangeNotSatisfiable: false,
		http.StatusExpectationFailed:            false,
		http.StatusTeapot:                       false,
		http.StatusUnprocessableEntity:          false,
		http.StatusLocked:                       false,
		http.StatusFailedDependency:             false,
		http.StatusUpgradeRequired:              false,
		http.StatusPreconditionRequired:         false,
		http.StatusTooManyRequests:              false,
		http.StatusRequestHeaderFieldsTooLarge:  false,
		http.StatusUnavailableForLegalReasons:   false,

		// 5xx
		http.StatusInternalServerError:           false,
		http.StatusNotImplemented:                false,
		http.StatusBadGateway:                    false,
		http.StatusServiceUnavailable:            false,
		http.StatusGatewayTimeout:                false,
		http.StatusHTTPVersionNotSupported:       false,
		http.StatusVariantAlsoNegotiates:         false,
		http.StatusInsufficientStorage:           false,
		http.StatusLoopDetected:                  false,
		http.StatusNotExtended:                   false,
		http.StatusNetworkAuthenticationRequired: false,
	}

	for _, statusCode := range retryCodes {
		tests[statusCode] = true
	}

	return tests
}

// DefaultRetryCodes returns the list of HTTP status codes that need to be retried.
func DefaultRetryCodes() []int {
	return []int{
		http.StatusInternalServerError,
		http.StatusNotImplemented,
		http.StatusBadGateway,
		http.StatusServiceUnavailable,
		http.StatusGatewayTimeout,
		http.StatusHTTPVersionNotSupported,
		http.StatusVariantAlsoNegotiates,
		http.StatusInsufficientStorage,
		http.StatusLoopDetected,
		http.StatusNotExtended,
		http.StatusNetworkAuthenticationRequired,
	}
}

// CreateTmpl returns a ready-to-use template.
func CreateTmpl(t *testing.T) *template.Template {
	tmpl, err := alertmanagertypes.FromGlobs([]string{})
	require.NoError(t, err)
	tmpl.ExternalURL, _ = url.Parse("http://am")
	return tmpl
}

// AssertNotifyLeaksNoSecret calls the Notify() method of the notifier, expects
// it to fail because the context is canceled by the server and checks that no
// secret data is leaked in the error message returned by Notify().
func AssertNotifyLeaksNoSecret(ctx context.Context, t *testing.T, n notify.Notifier, secret ...string) {
	t.Helper()
	require.NotEmpty(t, secret)

	ctx = notify.WithGroupKey(ctx, "1")
	ok, err := n.Notify(ctx, []*types.Alert{
		{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"lbl1": "val1",
				},
				StartsAt: time.Now(),
				EndsAt:   time.Now().Add(time.Hour),
			},
		},
	}...)

	require.Error(t, err)
	require.Contains(t, err.Error(), context.Canceled.Error())
	for _, s := range secret {
		require.NotContains(t, err.Error(), s)
	}
	require.True(t, ok)
}

// GetContextWithCancelingURL returns a context that gets canceled when a
// client does a GET request to the returned URL.
// Handlers passed to the function will be invoked in order before the context gets canceled.
// The last argument is a function that needs to be called before the caller returns.
func GetContextWithCancelingURL(h ...func(w http.ResponseWriter, r *http.Request)) (context.Context, *url.URL, func()) {
	done := make(chan struct{})
	ctx, cancel := context.WithCancel(context.Background())
	i := 0

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if i < len(h) {
			h[i](w, r)
		} else {
			cancel()
			<-done
		}
		i++
	}))

	// No need to check the error since httptest.NewServer always return a valid URL.
	u, _ := url.Parse(srv.URL)

	return ctx, u, func() {
		close(done)
		srv.Close()
	}
}
