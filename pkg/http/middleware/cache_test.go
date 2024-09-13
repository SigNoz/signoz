package middleware

import (
	"net"
	"net/http"
	"strconv"
	"testing"
	"time"

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
		require.NoError(t, server.Serve(listener))
	}()

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

			res, err := http.DefaultClient.Do(req)
			require.NoError(t, err)

			actual := res.Header.Get("Cache-control")
			require.NoError(t, err)

			require.Equal(t, "max-age="+strconv.Itoa(int(age.Seconds())), string(actual))
		})
	}
}
