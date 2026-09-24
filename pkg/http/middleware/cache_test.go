package middleware

import (
	"net"
	"net/http"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCache(t *testing.T) {
	t.Parallel()

	age := 20 * 24 * time.Hour
	m := NewCache(age)

	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)

	server := &http.Server{
		Handler: m.Wrap(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			rw.WriteHeader(204)
		})),
	}

	go func() {
		_ = server.Serve(listener)
	}()
	t.Cleanup(func() { _ = server.Close() })

	client := &http.Client{Transport: &http.Transport{}}
	t.Cleanup(client.CloseIdleConnections)

	testCases := []struct {
		name string
		age  time.Duration
	}{
		{
			name: "Success",
			age:  age,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "http://"+listener.Addr().String(), nil)
			require.NoError(t, err)

			res, err := client.Do(req)
			require.NoError(t, err)
			defer func() {
				require.NoError(t, res.Body.Close())
			}()

			actual := res.Header.Get("Cache-control")
			require.NoError(t, err)

			assert.Contains(t, actual, "max-age="+strconv.Itoa(int(age.Seconds())))
		})
	}
}
