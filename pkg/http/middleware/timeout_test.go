package middleware

import (
	"net"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestTimeout(t *testing.T) {
	t.Parallel()

	writeTimeout := 6 * time.Second
	defaultTimeout := 2 * time.Second
	maxTimeout := 4 * time.Second
	m := NewTimeout(zap.NewNop(), []string{"/excluded"}, defaultTimeout, maxTimeout)

	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)

	server := &http.Server{
		WriteTimeout: writeTimeout,
		Handler: m.Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, ok := r.Context().Deadline()
			if ok {
				<-r.Context().Done()
				require.Error(t, r.Context().Err())
			}
			w.WriteHeader(204)
		})),
	}

	go func() {
		require.NoError(t, server.Serve(listener))
	}()

	testCases := []struct {
		name   string
		wait   time.Duration
		header string
		path   string
	}{
		{
			name:   "WaitTillNoTimeoutForExcludedPath",
			wait:   1 * time.Nanosecond,
			header: "4",
			path:   "excluded",
		},
		{
			name:   "WaitTillHeaderTimeout",
			wait:   3 * time.Second,
			header: "3",
			path:   "header-timeout",
		},
		{
			name:   "WaitTillMaxTimeout",
			wait:   4 * time.Second,
			header: "5",
			path:   "max-timeout",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			start := time.Now()
			req, err := http.NewRequest("GET", "http://"+listener.Addr().String()+"/"+tc.path, nil)
			require.NoError(t, err)
			req.Header.Add(headerName, tc.header)

			_, err = http.DefaultClient.Do(req)
			require.NoError(t, err)

			// confirm that we waited at least till the "wait" time
			require.GreaterOrEqual(t, time.Since(start), tc.wait)
		})
	}
}
