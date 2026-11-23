package kafkaauditor

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/twmb/franz-go/pkg/kfake"
	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/version"
)

func TestExport_MutualTLS(t *testing.T) {
	certificates := newTestCertificates(t)

	cluster, err := kfake.NewCluster(
		kfake.NumBrokers(1),
		kfake.SeedTopics(1, "tls_audit"),
		kfake.TLS(&tls.Config{
			Certificates: []tls.Certificate{certificates.server},
			ClientCAs:    certificates.caPool,
			ClientAuth:   tls.RequireAndVerifyClientCert,
		}),
	)
	require.NoError(t, err)
	t.Cleanup(cluster.Close)

	testCases := []struct {
		name string
		tls  auditor.TLSConfig
		err  bool
	}{
		{
			name: "CAAndClientCertificate_Delivers",
			tls:  certificates.client,
		},
		{
			name: "TLSDisabled_Fails",
			tls:  auditor.TLSConfig{},
			err:  true,
		},
		{
			name: "WithoutClientCertificate_Fails",
			tls:  auditor.TLSConfig{Enabled: true, CAFile: certificates.client.CAFile},
			err:  true,
		},
		{
			name: "WithoutCA_Fails",
			tls:  auditor.TLSConfig{Enabled: true, CertFile: certificates.client.CertFile, KeyFile: certificates.client.KeyFile},
			err:  true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			config := auditor.Config{
				Provider:      "kafka",
				BufferSize:    10,
				BatchSize:     5,
				FlushInterval: 50 * time.Millisecond,
				Kafka: auditor.KafkaConfig{
					Brokers:         cluster.ListenAddrs(),
					Topic:           "tls_audit",
					ClientID:        "signoz-tls-test",
					Compression:     "lz4",
					ShutdownTimeout: 30 * time.Second,
					TLS:             testCase.tls,
				},
			}

			auditor, err := newProvider(context.Background(), instrumentationtest.New().ToProviderSettings(), config, nil, version.Info)
			require.NoError(t, err)
			provider := auditor.(*provider)
			defer provider.client.Close()

			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()

			err = provider.export(ctx, []audittypes.AuditEvent{newTestEvent(coretypes.ResourceUser, coretypes.VerbCreate, testCase.name)})
			if testCase.err {
				assert.True(t, errors.Is(err, context.DeadlineExceeded))
				return
			}

			require.NoError(t, err)
		})
	}

	consumerTLS, err := newTLSConfig(certificates.client)
	require.NoError(t, err)

	consumer, err := kgo.NewClient(
		kgo.SeedBrokers(cluster.ListenAddrs()...),
		kgo.DialTLSConfig(consumerTLS),
		kgo.ConsumeTopics("tls_audit"),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
	)
	require.NoError(t, err)
	defer consumer.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	fetches := consumer.PollFetches(ctx)
	require.Empty(t, fetches.Errors())
	assert.Len(t, fetches.Records(), 1)
}

func TestNewTLSConfig(t *testing.T) {
	certificates := newTestCertificates(t)

	notPEMFile := filepath.Join(t.TempDir(), "not-pem.crt")
	require.NoError(t, os.WriteFile(notPEMFile, []byte("not a pem"), 0o600))

	testCases := []struct {
		name             string
		config           auditor.TLSConfig
		err              bool
		wantRootCAs      bool
		wantCertificates int
	}{
		{
			name:   "NoFiles_UsesSystemRoots",
			config: auditor.TLSConfig{Enabled: true},
		},
		{
			name:        "CAOnly",
			config:      auditor.TLSConfig{Enabled: true, CAFile: certificates.client.CAFile},
			wantRootCAs: true,
		},
		{
			name:             "CAAndClientCertificate",
			config:           certificates.client,
			wantRootCAs:      true,
			wantCertificates: 1,
		},
		{
			name:   "CAFileMissing",
			config: auditor.TLSConfig{Enabled: true, CAFile: filepath.Join(t.TempDir(), "missing-ca.crt")},
			err:    true,
		},
		{
			name:   "CAFileNotPEM",
			config: auditor.TLSConfig{Enabled: true, CAFile: notPEMFile},
			err:    true,
		},
		{
			name:   "KeyFileMissing",
			config: auditor.TLSConfig{Enabled: true, CertFile: certificates.client.CertFile, KeyFile: filepath.Join(t.TempDir(), "missing.key")},
			err:    true,
		},
		{
			name:   "CertFileNotPEM",
			config: auditor.TLSConfig{Enabled: true, CertFile: notPEMFile, KeyFile: certificates.client.KeyFile},
			err:    true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			tlsConfig, err := newTLSConfig(testCase.config)
			if testCase.err {
				assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.wantRootCAs, tlsConfig.RootCAs != nil)
			assert.Len(t, tlsConfig.Certificates, testCase.wantCertificates)
		})
	}
}

type testCertificates struct {
	caPool *x509.CertPool
	server tls.Certificate
	client auditor.TLSConfig
}

// Issues a CA, a broker certificate for 127.0.0.1 and a client certificate, writing the client side as ca.crt, tls.crt and tls.key.
func newTestCertificates(t *testing.T) testCertificates {
	t.Helper()

	caKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	caTemplate := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: "test-ca"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		IsCA:                  true,
		BasicConstraintsValid: true,
		KeyUsage:              x509.KeyUsageCertSign,
	}
	caDER, err := x509.CreateCertificate(rand.Reader, caTemplate, caTemplate, &caKey.PublicKey, caKey)
	require.NoError(t, err)
	ca, err := x509.ParseCertificate(caDER)
	require.NoError(t, err)

	serverCertPEM, serverKeyPEM := issueTestCertificate(t, ca, caKey, &x509.Certificate{
		SerialNumber: big.NewInt(2),
		Subject:      pkix.Name{CommonName: "broker"},
		IPAddresses:  []net.IP{net.ParseIP("127.0.0.1")},
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	})
	server, err := tls.X509KeyPair(serverCertPEM, serverKeyPEM)
	require.NoError(t, err)

	clientCertPEM, clientKeyPEM := issueTestCertificate(t, ca, caKey, &x509.Certificate{
		SerialNumber: big.NewInt(3),
		Subject:      pkix.Name{CommonName: "signoz"},
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	})

	dir := t.TempDir()
	client := auditor.TLSConfig{
		Enabled:  true,
		CAFile:   filepath.Join(dir, "ca.crt"),
		CertFile: filepath.Join(dir, "tls.crt"),
		KeyFile:  filepath.Join(dir, "tls.key"),
	}
	require.NoError(t, os.WriteFile(client.CAFile, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: caDER}), 0o600))
	require.NoError(t, os.WriteFile(client.CertFile, clientCertPEM, 0o600))
	require.NoError(t, os.WriteFile(client.KeyFile, clientKeyPEM, 0o600))

	caPool := x509.NewCertPool()
	caPool.AddCert(ca)

	return testCertificates{caPool: caPool, server: server, client: client}
}

func issueTestCertificate(t *testing.T, ca *x509.Certificate, caKey *ecdsa.PrivateKey, template *x509.Certificate) ([]byte, []byte) {
	t.Helper()

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	template.NotBefore = time.Now().Add(-time.Hour)
	template.NotAfter = time.Now().Add(time.Hour)
	template.KeyUsage = x509.KeyUsageDigitalSignature

	der, err := x509.CreateCertificate(rand.Reader, template, ca, &key.PublicKey, caKey)
	require.NoError(t, err)

	keyDER, err := x509.MarshalECPrivateKey(key)
	require.NoError(t, err)

	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})
}
