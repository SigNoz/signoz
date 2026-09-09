package server

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"io"
	"log/slog"
	"math/big"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNew(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})
	certFile, keyFile := writeSelfSignedCert(t)

	corruptFile := filepath.Join(t.TempDir(), "corrupt.crt")
	require.NoError(t, os.WriteFile(corruptFile, []byte("not a pem"), 0o644))

	testCases := []struct {
		name       string
		config     Config
		err        bool
		minVersion uint16
	}{
		{
			name:   "TLSDisabled",
			config: Config{},
		},
		{
			name:   "TLSDisabled_WithCertAndKey",
			config: Config{TLS: TLS{CertFile: "ignored.crt", KeyFile: "ignored.key"}},
		},
		{
			name:   "TLSEnabled_WithoutCertAndKey",
			config: Config{TLS: TLS{Enabled: true}},
			err:    true,
		},
		{
			name:   "TLSEnabled_WithoutKey",
			config: Config{TLS: TLS{Enabled: true, CertFile: "server.crt"}},
			err:    true,
		},
		{
			name:   "TLSEnabled_WithoutCert",
			config: Config{TLS: TLS{Enabled: true, KeyFile: "server.key"}},
			err:    true,
		},
		{
			name:   "TLSEnabled_InvalidMinVersion",
			config: Config{TLS: TLS{Enabled: true, CertFile: "tls.crt", KeyFile: "tls.key", MinVersion: "1.1"}},
			err:    true,
		},
		{
			name:   "TLSEnabled_MissingFiles",
			config: Config{TLS: TLS{Enabled: true, CertFile: "missing.crt", KeyFile: "missing.key"}},
			err:    true,
		},
		{
			name:   "TLSEnabled_CorruptCertFile",
			config: Config{TLS: TLS{Enabled: true, CertFile: corruptFile, KeyFile: keyFile}},
			err:    true,
		},
		{
			name:   "TLSEnabled_DefaultVersions",
			config: Config{TLS: TLS{Enabled: true, CertFile: certFile, KeyFile: keyFile}},
		},
		{
			name:       "TLSEnabled_WithMin",
			config:     Config{TLS: TLS{Enabled: true, CertFile: certFile, KeyFile: keyFile, MinVersion: "1.3"}},
			minVersion: tls.VersionTLS13,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			server, err := New(logger, testCase.config, handler)
			if testCase.err {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			if !testCase.config.TLS.Enabled {
				assert.Nil(t, server.srv.TLSConfig)
				return
			}

			require.NotNil(t, server.srv.TLSConfig)
			assert.Len(t, server.srv.TLSConfig.Certificates, 1)
			assert.Equal(t, testCase.minVersion, server.srv.TLSConfig.MinVersion)
		})
	}
}

func TestStartWithTLS(t *testing.T) {
	certFile, keyFile := writeSelfSignedCert(t)
	addr := freeAddr(t)

	server, err := New(
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		Config{Address: addr, TLS: TLS{Enabled: true, CertFile: certFile, KeyFile: keyFile}},
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("ok")) }),
	)
	require.NoError(t, err)

	errC := make(chan error, 1)
	go func() { errC <- server.Start(context.Background()) }()

	certPEM, err := os.ReadFile(certFile)
	require.NoError(t, err)
	pool := x509.NewCertPool()
	require.True(t, pool.AppendCertsFromPEM(certPEM))
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool}}}

	var resp *http.Response
	require.Eventually(t, func() bool {
		resp, err = client.Get("https://" + addr)
		return err == nil
	}, 5*time.Second, 25*time.Millisecond)
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "ok", string(body))
	require.NotNil(t, resp.TLS)
	assert.GreaterOrEqual(t, resp.TLS.Version, uint16(tls.VersionTLS12))

	plainResp, err := http.Get("http://" + addr)
	require.NoError(t, err)
	_ = plainResp.Body.Close()
	assert.Equal(t, http.StatusBadRequest, plainResp.StatusCode)

	require.NoError(t, server.Stop(context.Background()))
	require.NoError(t, <-errC)
}

func TestStartWithoutTLS(t *testing.T) {
	addr := freeAddr(t)

	server, err := New(
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		Config{Address: addr},
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("pong")) }),
	)
	require.NoError(t, err)

	errC := make(chan error, 1)
	go func() { errC <- server.Start(context.Background()) }()

	var resp *http.Response
	require.Eventually(t, func() bool {
		var err error
		resp, err = http.Get("http://" + addr)
		return err == nil
	}, 5*time.Second, 25*time.Millisecond)
	defer func() { _ = resp.Body.Close() }()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Nil(t, resp.TLS)

	require.NoError(t, server.Stop(context.Background()))
	require.NoError(t, <-errC)
}

func freeAddr(t *testing.T) string {
	t.Helper()

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	defer func() { _ = listener.Close() }()

	return listener.Addr().String()
}

func writeSelfSignedCert(t *testing.T) (string, string) {
	t.Helper()

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	template := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "localhost"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		IPAddresses:  []net.IP{net.ParseIP("127.0.0.1")},
	}

	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	require.NoError(t, err)

	keyDER, err := x509.MarshalECPrivateKey(key)
	require.NoError(t, err)

	dir := t.TempDir()
	certFile := filepath.Join(dir, "server.crt")
	keyFile := filepath.Join(dir, "server.key")

	require.NoError(t, os.WriteFile(certFile, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0o644))
	require.NoError(t, os.WriteFile(keyFile, pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER}), 0o600))

	return certFile, keyFile
}
