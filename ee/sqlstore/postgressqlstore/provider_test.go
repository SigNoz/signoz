package postgressqlstore

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const tlsVersion12 = 0x0303

func TestBuildTLSConfig(t *testing.T) {
	const dsn = "postgres://signoz:signoz@db.example.com:5432/signoz"

	t.Run("all SSL fields empty returns nil config", func(t *testing.T) {
		got, err := buildTLSConfig(sqlstore.PostgresConfig{DSN: dsn})
		require.NoError(t, err)
		assert.Nil(t, got)
	})

	t.Run("ssl_mode disable returns nil config", func(t *testing.T) {
		got, err := buildTLSConfig(sqlstore.PostgresConfig{DSN: dsn, SSLMode: "disable"})
		require.NoError(t, err)
		assert.Nil(t, got)
	})

	t.Run("ssl_mode allow returns nil config", func(t *testing.T) {
		got, err := buildTLSConfig(sqlstore.PostgresConfig{DSN: dsn, SSLMode: "allow"})
		require.NoError(t, err)
		assert.Nil(t, got)
	})

	t.Run("ssl_mode prefer returns nil config", func(t *testing.T) {
		got, err := buildTLSConfig(sqlstore.PostgresConfig{DSN: dsn, SSLMode: "prefer"})
		require.NoError(t, err)
		assert.Nil(t, got)
	})

	t.Run("ssl_mode require builds TLS config with MinVersion 1.2 and ServerName from DSN", func(t *testing.T) {
		got, err := buildTLSConfig(sqlstore.PostgresConfig{DSN: dsn, SSLMode: "require"})
		require.NoError(t, err)
		require.NotNil(t, got)
		assert.GreaterOrEqual(t, uint16(got.MinVersion), uint16(tlsVersion12))
		assert.Equal(t, "db.example.com", got.ServerName)
		assert.NotNil(t, got.RootCAs)
		assert.Empty(t, got.Certificates)
	})

	t.Run("ServerName comes from DSN host even when DSN has sslmode=disable", func(t *testing.T) {
		got, err := buildTLSConfig(sqlstore.PostgresConfig{
			DSN:     "postgres://user:pw@internal-pg:5432/db?sslmode=disable",
			SSLMode: "verify-full",
		})
		require.NoError(t, err)
		require.NotNil(t, got)
		assert.Equal(t, "internal-pg", got.ServerName)
	})

	t.Run("only ssl_cert without ssl_key is an error", func(t *testing.T) {
		_, err := buildTLSConfig(sqlstore.PostgresConfig{DSN: dsn, SSLMode: "require", SSLCert: "/tmp/cert"})
		require.Error(t, err)
	})

	t.Run("only ssl_key without ssl_cert is an error", func(t *testing.T) {
		_, err := buildTLSConfig(sqlstore.PostgresConfig{DSN: dsn, SSLMode: "require", SSLKey: "/tmp/key"})
		require.Error(t, err)
	})

	t.Run("missing ssl_root_cert file is an error", func(t *testing.T) {
		_, err := buildTLSConfig(sqlstore.PostgresConfig{
			DSN:         dsn,
			SSLMode:     "verify-ca",
			SSLRootCert: filepath.Join(t.TempDir(), "missing.pem"),
		})
		require.Error(t, err)
	})

	t.Run("malformed ssl_root_cert is an error", func(t *testing.T) {
		bad := filepath.Join(t.TempDir(), "bad.pem")
		require.NoError(t, os.WriteFile(bad, []byte("not a certificate"), 0o600))
		_, err := buildTLSConfig(sqlstore.PostgresConfig{DSN: dsn, SSLMode: "verify-ca", SSLRootCert: bad})
		require.Error(t, err)
	})
}

func TestBuildTLSConfig_WithCAAndClientCert(t *testing.T) {
	dir := t.TempDir()
	caCertDER, caKeyDER := writeSelfSignedCA(t, dir)
	caPath := writeCertPEM(t, dir, "ca", caCertDER)

	certDER, keyDER := writeLeafCertAndKey(t, dir, "client", caCertDER, caKeyDER)
	certPath := writeCertPEM(t, dir, "client", certDER)
	keyPath := writeKeyPEM(t, dir, "client", keyDER)

	cfg := sqlstore.PostgresConfig{
		DSN:         "postgres://signoz@pg:5432/signoz",
		SSLMode:     "verify-full",
		SSLCert:     certPath,
		SSLKey:      keyPath,
		SSLRootCert: caPath,
	}

	got, err := buildTLSConfig(cfg)
	require.NoError(t, err)
	require.NotNil(t, got)
	require.NotNil(t, got.RootCAs)
	assert.Equal(t, "pg", got.ServerName)
	require.Len(t, got.Certificates, 1)
	require.Len(t, got.Certificates[0].Certificate, 1)
	assert.Equal(t, certDER, got.Certificates[0].Certificate[0])
}

// writeSelfSignedCA generates a self-signed CA cert, writes its PEM, and returns
// (certDER, keyDER) so leaf certs can be signed with the CA's key.
func writeSelfSignedCA(t *testing.T, dir string) (certDER, keyDER []byte) {
	t.Helper()

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	tmpl := &x509.Certificate{
		SerialNumber:          big.NewInt(time.Now().UnixNano()),
		Subject:               pkix.Name{CommonName: "ca"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageDigitalSignature,
		BasicConstraintsValid: true,
		IsCA:                  true,
	}

	certDER, err = x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	require.NoError(t, err)

	keyDER, err = x509.MarshalPKCS8PrivateKey(key)
	require.NoError(t, err)
	return certDER, keyDER
}

// writeLeafCertAndKey generates a leaf cert signed by the supplied CA. The leaf's
// private key is freshly generated. Returns (certDER, keyDER).
func writeLeafCertAndKey(t *testing.T, dir, name string, caCertDER, caKeyDER []byte) (certDER, keyDER []byte) {
	t.Helper()

	caCert, err := x509.ParseCertificate(caCertDER)
	require.NoError(t, err)
	caKey, err := x509.ParsePKCS8PrivateKey(caKeyDER)
	require.NoError(t, err)

	leafKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(time.Now().UnixNano() + 1),
		Subject:      pkix.Name{CommonName: name},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	}

	certDER, err = x509.CreateCertificate(rand.Reader, tmpl, caCert, &leafKey.PublicKey, caKey)
	require.NoError(t, err)

	keyDER, err = x509.MarshalPKCS8PrivateKey(leafKey)
	require.NoError(t, err)
	return certDER, keyDER
}

func writeCertPEM(t *testing.T, dir, name string, der []byte) string {
	t.Helper()
	path := filepath.Join(dir, name+".pem")
	pemBytes := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	require.NoError(t, os.WriteFile(path, pemBytes, 0o600))
	return path
}

func writeKeyPEM(t *testing.T, dir, name string, der []byte) string {
	t.Helper()
	path := filepath.Join(dir, name+".key")
	pemBytes := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der})
	require.NoError(t, os.WriteFile(path, pemBytes, 0o600))
	return path
}
