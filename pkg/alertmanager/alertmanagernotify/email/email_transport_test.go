// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package email

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/hmac"
	"crypto/md5"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/binary"
	"encoding/pem"
	"fmt"
	"io"
	"log/slog"
	"math/big"
	"mime"
	"mime/multipart"
	"net"
	"net/mail"
	"net/textproto"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
	"go.uber.org/goleak"
)

const smtpTransportWatchdog = 5 * time.Second

type smtpTransportPKI struct {
	ca, clientCert, clientKey string
	server                    tls.Certificate
	roots                     *x509.CertPool
}

func newSMTPTransportPKI(t *testing.T) smtpTransportPKI {
	t.Helper()
	var serial int64
	issue := func(cert, parent *x509.Certificate, signer *ecdsa.PrivateKey) (tls.Certificate, string, string, *ecdsa.PrivateKey) {
		t.Helper()
		key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		if err != nil {
			t.Fatal(err)
		}
		serial++
		cert.SerialNumber = big.NewInt(serial)
		cert.NotBefore, cert.NotAfter = time.Now().Add(-time.Hour), time.Now().Add(time.Hour)
		if parent == nil {
			parent, signer = cert, key
		}
		der, err := x509.CreateCertificate(rand.Reader, cert, parent, &key.PublicKey, signer)
		if err != nil {
			t.Fatal(err)
		}
		keyDER, err := x509.MarshalECPrivateKey(key)
		if err != nil {
			t.Fatal(err)
		}
		certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
		keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})
		pair, err := tls.X509KeyPair(certPEM, keyPEM)
		if err != nil {
			t.Fatal(err)
		}
		return pair, string(certPEM), string(keyPEM), key
	}
	ca := &x509.Certificate{Subject: pkix.Name{CommonName: "SMTP test CA"}, IsCA: true,
		BasicConstraintsValid: true, KeyUsage: x509.KeyUsageCertSign | x509.KeyUsageDigitalSignature}
	_, caPEM, _, caKey := issue(ca, nil, nil)
	server, _, _, _ := issue(&x509.Certificate{
		DNSNames: []string{"localhost", "smtp.test"}, IPAddresses: []net.IP{net.ParseIP("127.0.0.1")},
		KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	}, ca, caKey)
	_, clientCert, clientKey, _ := issue(&x509.Certificate{
		Subject: pkix.Name{CommonName: "SMTP test client"}, KeyUsage: x509.KeyUsageDigitalSignature,
		ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	}, ca, caKey)
	roots := x509.NewCertPool()
	if !roots.AppendCertsFromPEM([]byte(caPEM)) {
		t.Fatal("invalid generated CA")
	}
	return smtpTransportPKI{ca: caPEM, server: server, clientCert: clientCert, clientKey: clientKey, roots: roots}
}

type smtpTransportScenario struct {
	mode, auth, stall string
	serverTLS         *tls.Config
}

type smtpTransportResult struct {
	retry bool
	err   error
}

type smtpTransportRun struct {
	reached chan struct{}
	peer    chan error
	notify  chan smtpTransportResult
	ctx     context.Context
	cancel  context.CancelFunc
}

func startSMTPTransport(t *testing.T, pki smtpTransportPKI, scenario smtpTransportScenario, timeout time.Duration, configure func(*config.EmailConfig, *tls.Config)) *smtpTransportRun {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = listener.Close() })
	requireTLS, implicitTLS := scenario.mode == "starttls", scenario.mode == "implicit"
	cfg := &config.EmailConfig{
		Smarthost: config.HostPort{Host: "127.0.0.1", Port: strconv.Itoa(listener.Addr().(*net.TCPAddr).Port)},
		Hello:     "smtp-client.test", From: emailFrom, To: emailTo,
		Headers: map[string]string{"Subject": "Transport {{ len .Alerts }} {{ .Status }}"},
		Text:    "Text {{ .Status }}\n.leading dot\n", HTML: "<b>HTML {{ .Status }}</b>",
		RequireTLS: &requireTLS, ForceImplicitTLS: &implicitTLS, TLSConfig: &commoncfg.TLSConfig{CA: pki.ca},
	}
	if scenario.auth != "" {
		cfg.AuthIdentity, cfg.AuthUsername = "identity", "username"
		cfg.AuthPassword, cfg.AuthSecret = "password", "cram-secret"
	}
	scenario.serverTLS = &tls.Config{Certificates: []tls.Certificate{pki.server}, MinVersion: tls.VersionTLS12}
	if configure != nil {
		configure(cfg, scenario.serverTLS)
	}
	tmpl, alert, err := prepare(cfg)
	if err != nil {
		t.Fatal(err)
	}
	email := New(cfg, tmpl, slog.New(slog.DiscardHandler), testTemplater(tmpl))
	ctx, cancel := context.WithCancel(context.Background())
	if timeout > 0 {
		cancel()
		ctx, cancel = context.WithTimeout(context.Background(), timeout)
	}
	run := &smtpTransportRun{reached: make(chan struct{}), peer: make(chan error, 1),
		notify: make(chan smtpTransportResult, 1), ctx: ctx, cancel: cancel}
	peerDone, notifyDone := make(chan struct{}), make(chan struct{})
	var mu sync.Mutex
	var conn net.Conn
	var stopping bool
	t.Cleanup(func() {
		cancel()
		_ = listener.Close()
		mu.Lock()
		stopping = true
		if conn != nil {
			_ = conn.Close()
		}
		mu.Unlock()
		timer := time.NewTimer(smtpTransportWatchdog)
		defer timer.Stop()
		for _, done := range []chan struct{}{peerDone, notifyDone} {
			select {
			case <-done:
			case <-timer.C:
				t.Error("SMTP goroutine did not stop after cleanup closed the socket")
				return
			}
		}
	})
	go func() {
		defer close(peerDone)
		accepted, err := listener.Accept()
		if err == nil {
			defer accepted.Close()
			mu.Lock()
			conn = accepted
			if stopping {
				_ = accepted.Close()
			}
			mu.Unlock()
			err = serveSMTPTransport(accepted, scenario, run.reached)
		}
		run.peer <- err
	}()
	go func() {
		defer close(notifyDone)
		retry, err := email.Notify(ctx, alert)
		run.notify <- smtpTransportResult{retry, err}
	}()
	return run
}

func awaitSMTPTransport[T any](t *testing.T, result <-chan T) T {
	t.Helper()
	timer := time.NewTimer(smtpTransportWatchdog)
	defer timer.Stop()
	select {
	case value := <-result:
		return value
	case <-timer.C:
		t.Fatal("SMTP watchdog expired before client/peer completion; socket is still open")
		var zero T
		return zero
	}
}

func smtpTransportExpect(peer *textproto.Conn, want string) error {
	got, err := peer.ReadLine()
	if err != nil {
		return err
	}
	if strings.TrimSpace(got) != want {
		return errors.NewInternalf(errors.CodeInternal, "SMTP command: got %q, want %q", got, want)
	}
	return nil
}

func smtpTransportExchange(peer *textproto.Conn, command, response string) error {
	if err := smtpTransportExpect(peer, command); err != nil {
		return err
	}
	return peer.PrintfLine("%s", response)
}

func serveSMTPTransport(conn net.Conn, scenario smtpTransportScenario, reached chan struct{}) error {
	stall := func() error {
		close(reached)
		_, err := io.Copy(io.Discard, conn)
		return err
	}
	upgrade := func() (net.Conn, error) {
		if scenario.stall == "handshake" {
			var header [5]byte
			if _, err := io.ReadFull(conn, header[:]); err != nil {
				return nil, err
			}
			if header[0] != 22 {
				return nil, errors.NewInternalf(errors.CodeInternal, "expected TLS handshake record, got %d", header[0])
			}
			if _, err := io.CopyN(io.Discard, conn, int64(binary.BigEndian.Uint16(header[3:]))); err != nil {
				return nil, err
			}
			return conn, stall()
		}
		tlsConn := tls.Server(conn, scenario.serverTLS)
		return tlsConn, tlsConn.Handshake()
	}
	wire := conn
	if scenario.mode == "implicit" {
		var err error
		wire, err = upgrade()
		if err != nil || scenario.stall == "handshake" {
			return err
		}
	}
	if scenario.stall == "greeting" {
		return stall()
	}
	peer := textproto.NewConn(wire)
	if err := peer.PrintfLine("220 localhost ESMTP"); err != nil {
		return err
	}
	hello := func(startTLS bool) error {
		caps := "250-localhost\r\n"
		if startTLS {
			caps += "250-STARTTLS\r\n"
		}
		caps += "250 OK"
		if scenario.auth != "" {
			caps = strings.TrimSuffix(caps, "250 OK") + "250 AUTH " + scenario.auth
		}
		return smtpTransportExchange(peer, "EHLO smtp-client.test", caps)
	}
	if err := hello(scenario.mode == "starttls"); err != nil {
		return err
	}
	if scenario.mode == "starttls" {
		if err := smtpTransportExpect(peer, "STARTTLS"); err != nil {
			return err
		}
		if scenario.stall == "starttls-response" {
			return stall()
		}
		if err := peer.PrintfLine("220 begin TLS"); err != nil {
			return err
		}
		upgraded, err := upgrade()
		if err != nil || scenario.stall == "handshake" {
			return err
		}
		peer = textproto.NewConn(upgraded)
		if err := hello(false); err != nil {
			return err
		}
	}
	if scenario.auth != "" {
		if err := smtpTransportAuthenticate(peer, scenario.auth); err != nil {
			return err
		}
		if scenario.stall == "auth-response" {
			return stall()
		}
		if err := peer.PrintfLine("235 authenticated"); err != nil {
			return err
		}
	}
	for _, command := range []string{"MAIL FROM:<" + emailFrom + ">", "RCPT TO:<" + emailTo + ">"} {
		if err := smtpTransportExchange(peer, command, "250 accepted"); err != nil {
			return err
		}
	}
	if err := smtpTransportExpect(peer, "DATA"); err != nil {
		return err
	}
	if scenario.stall == "data-354" {
		return stall()
	}
	if err := peer.PrintfLine("354 send message"); err != nil {
		return err
	}
	body, err := peer.ReadDotBytes()
	if err != nil {
		return err
	}
	if err := checkSMTPTransportMessage(body); err != nil {
		return err
	}
	if scenario.stall == "data-250" {
		return stall()
	}
	if err := peer.PrintfLine("250 delivered"); err != nil {
		return err
	}
	if err := smtpTransportExpect(peer, "QUIT"); err != nil {
		return err
	}
	if scenario.stall == "quit" {
		return stall()
	}
	if scenario.stall == "quit-rejected" {
		if err := peer.PrintfLine("500 QUIT rejected"); err != nil {
			return err
		}
		_, err := io.Copy(io.Discard, conn)
		return err
	}
	return peer.PrintfLine("221 goodbye")
}

func smtpTransportAuthenticate(peer *textproto.Conn, mechanism string) error {
	encode := func(value string) string { return base64.StdEncoding.EncodeToString([]byte(value)) }
	switch mechanism {
	case "PLAIN":
		return smtpTransportExpect(peer, "AUTH PLAIN "+encode("identity\x00username\x00password"))
	case "LOGIN":
		if err := smtpTransportExchange(peer, "AUTH LOGIN", "334 "+encode("Username:")); err != nil {
			return err
		}
		if err := smtpTransportExchange(peer, encode("username"), "334 "+encode("Password:")); err != nil {
			return err
		}
		return smtpTransportExpect(peer, encode("password"))
	case "CRAM-MD5":
		challenge := "<smtp-transport@localhost>"
		if err := smtpTransportExchange(peer, "AUTH CRAM-MD5", "334 "+encode(challenge)); err != nil {
			return err
		}
		mac := hmac.New(md5.New, []byte("cram-secret"))
		_, _ = mac.Write([]byte(challenge))
		return smtpTransportExpect(peer, encode(fmt.Sprintf("username %x", mac.Sum(nil))))
	default:
		return errors.NewInternalf(errors.CodeInternal, "unsupported test AUTH mechanism %q", mechanism)
	}
}

func checkSMTPTransportMessage(body []byte) error {
	message, err := mail.ReadMessage(bytes.NewReader(body))
	if err != nil {
		return err
	}
	for header, want := range map[string]string{
		"From": emailFrom, "To": emailTo, "Subject": "Transport 1 firing", "MIME-Version": "1.0",
	} {
		got, err := new(mime.WordDecoder).DecodeHeader(message.Header.Get(header))
		if err != nil || got != want {
			return errors.NewInternalf(errors.CodeInternal, "MIME %s: got %q (%v), want %q", header, got, err, want)
		}
	}
	mediaType, params, err := mime.ParseMediaType(message.Header.Get("Content-Type"))
	if err != nil || mediaType != "multipart/alternative" || params["boundary"] == "" {
		return errors.NewInternalf(errors.CodeInternal, "invalid multipart content type: %q (%v)", mediaType, err)
	}
	reader := multipart.NewReader(message.Body, params["boundary"])
	for _, want := range []struct{ kind, body string }{{"text/plain", "Text firing\n.leading dot\n"}, {"text/html", "<b>HTML firing</b>"}} {
		part, err := reader.NextPart()
		if err != nil {
			return err
		}
		content, err := io.ReadAll(part)
		_ = part.Close()
		if err != nil {
			return err
		}
		kind, _, err := mime.ParseMediaType(part.Header.Get("Content-Type"))
		if err != nil || kind != want.kind || string(content) != want.body {
			return errors.NewInternalf(errors.CodeInternal, "MIME part: got %q %q (%v), want %q %q", kind, content, err, want.kind, want.body)
		}
	}
	if _, err := reader.NextPart(); !errors.Is(err, io.EOF) {
		return errors.NewInternalf(errors.CodeInternal, "expected MIME EOF, got %v", err)
	}
	return nil
}

func TestEmailTransportSuccess(t *testing.T) {
	defer goleak.VerifyNone(t, goleak.IgnoreCurrent())
	pki := newSMTPTransportPKI(t)
	for _, tc := range []struct {
		name, mode, auth string
		clientCert       bool
	}{
		{name: "plain-noauth", mode: "plain"},
		{name: "starttls-plain", mode: "starttls", auth: "PLAIN"},
		{name: "starttls-login", mode: "starttls", auth: "LOGIN"},
		{name: "starttls-cram-md5", mode: "starttls", auth: "CRAM-MD5"},
		{name: "implicit-ephemeral-port", mode: "implicit", auth: "PLAIN"},
		{name: "starttls-client-certificate", mode: "starttls", clientCert: true},
		{name: "implicit-client-certificate", mode: "implicit", clientCert: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			run := startSMTPTransport(t, pki, smtpTransportScenario{mode: tc.mode, auth: tc.auth}, 0, func(cfg *config.EmailConfig, server *tls.Config) {
				if tc.mode == "implicit" {
					*cfg.RequireTLS = true
				}
				if tc.clientCert {
					cfg.TLSConfig.ServerName = "smtp.test"
					cfg.TLSConfig.Cert, cfg.TLSConfig.Key = pki.clientCert, commoncfg.Secret(pki.clientKey)
					server.ClientAuth, server.ClientCAs = tls.RequireAndVerifyClientCert, pki.roots
				}
			})
			result := awaitSMTPTransport(t, run.notify)
			if result.retry || result.err != nil {
				t.Fatalf("Notify = (%v, %v), want (false, nil)", result.retry, result.err)
			}
			if err := awaitSMTPTransport(t, run.peer); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestEmailTransportTLSVerification(t *testing.T) {
	defer goleak.VerifyNone(t, goleak.IgnoreCurrent())
	pki, untrusted := newSMTPTransportPKI(t), newSMTPTransportPKI(t)
	for _, mode := range []string{"starttls", "implicit"} {
		for _, failure := range []string{"wrong-server-name", "untrusted-ca"} {
			t.Run(mode+"/"+failure, func(t *testing.T) {
				run := startSMTPTransport(t, pki, smtpTransportScenario{mode: mode}, 0, func(cfg *config.EmailConfig, _ *tls.Config) {
					if failure == "wrong-server-name" {
						cfg.TLSConfig.ServerName = "wrong.test"
					} else {
						cfg.TLSConfig.CA = untrusted.ca
					}
				})
				result := awaitSMTPTransport(t, run.notify)
				var hostname x509.HostnameError
				var authority x509.UnknownAuthorityError
				if !result.retry || (failure == "wrong-server-name" && !errors.As(result.err, &hostname)) ||
					(failure == "untrusted-ca" && !errors.As(result.err, &authority)) {
					t.Fatalf("Notify = (%v, %v), want retryable %s rejection", result.retry, result.err, failure)
				}
				if err := awaitSMTPTransport(t, run.peer); err == nil {
					t.Fatal("peer unexpectedly completed rejected TLS handshake")
				}
			})
		}
	}
}

func TestEmailTransportCancellation(t *testing.T) {
	defer goleak.VerifyNone(t, goleak.IgnoreCurrent())
	pki := newSMTPTransportPKI(t)
	for _, scenario := range []smtpTransportScenario{
		{mode: "plain", stall: "greeting"},
		{mode: "implicit", stall: "handshake"},
		{mode: "implicit", stall: "greeting"},
		{mode: "starttls", stall: "starttls-response"},
		{mode: "starttls", stall: "handshake"},
		{mode: "starttls", auth: "PLAIN", stall: "auth-response"},
		{mode: "starttls", auth: "LOGIN", stall: "auth-response"},
		{mode: "starttls", auth: "CRAM-MD5", stall: "auth-response"},
		{mode: "plain", stall: "data-354"},
		{mode: "plain", stall: "data-250"},
		{mode: "plain", stall: "quit"},
		{mode: "starttls", stall: "data-250"},
		{mode: "implicit", stall: "quit"},
	} {
		for _, trigger := range []string{"cancel", "deadline"} {
			t.Run(strings.Join([]string{scenario.mode, scenario.stall, scenario.auth, trigger}, "/"), func(t *testing.T) {
				var timeout time.Duration
				if trigger == "deadline" {
					timeout = time.Second
				}
				run := startSMTPTransport(t, pki, scenario, timeout, nil)
				timer := time.NewTimer(smtpTransportWatchdog)
				defer timer.Stop()
				select {
				case <-run.reached:
				case err := <-run.peer:
					t.Fatalf("peer exited before stalled stage: %v", err)
				case result := <-run.notify:
					t.Fatalf("Notify exited before stalled stage: %+v", result)
				case <-timer.C:
					t.Fatal("peer never reached stalled stage")
				}
				if err := run.ctx.Err(); err != nil {
					t.Fatalf("context ended before stalled stage: %v", err)
				}
				deadline, hasDeadline := run.ctx.Deadline()
				if trigger == "cancel" {
					if hasDeadline {
						t.Fatal("explicit cancellation must have no deadline")
					}
					run.cancel()
				} else {
					if !hasDeadline || time.Until(deadline) < 500*time.Millisecond {
						t.Fatal("insufficient deadline budget after reaching stalled stage")
					}
					awaitSMTPTransport(t, run.ctx.Done())
				}
				result := awaitSMTPTransport(t, run.notify)
				if scenario.stall == "quit" {
					if result.retry || result.err != nil {
						t.Fatalf("acknowledged delivery = (%v, %v), want (false, nil)", result.retry, result.err)
					}
				} else if !result.retry || result.err == nil {
					t.Fatalf("Notify = (%v, %v), want a retryable transport error", result.retry, result.err)
				}
				if err := awaitSMTPTransport(t, run.peer); err != nil {
					t.Fatalf("peer did not observe clean remote closure: %v", err)
				}
			})
		}
	}
}

func TestEmailTransportRejectedQuitClosesConnection(t *testing.T) {
	defer goleak.VerifyNone(t, goleak.IgnoreCurrent())
	pki := newSMTPTransportPKI(t)
	for _, mode := range []string{"plain", "starttls", "implicit"} {
		t.Run(mode, func(t *testing.T) {
			run := startSMTPTransport(t, pki, smtpTransportScenario{mode: mode, stall: "quit-rejected"}, 0, nil)
			result := awaitSMTPTransport(t, run.notify)
			if result.retry || result.err != nil {
				t.Fatalf("acknowledged delivery = (%v, %v), want (false, nil)", result.retry, result.err)
			}
			if err := awaitSMTPTransport(t, run.peer); err != nil {
				t.Fatalf("peer did not observe connection closure after rejected QUIT: %v", err)
			}
		})
	}
}
