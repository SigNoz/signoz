package client

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"log/slog"
	"math/rand"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

// Email implements a Notifier for email notifications.

// // Email address to notify.
// To               string               `yaml:"to,omitempty" json:"to,omitempty"`
// From             string               `yaml:"from,omitempty" json:"from,omitempty"`
// Hello            string               `yaml:"hello,omitempty" json:"hello,omitempty"`
// Smarthost        HostPort             `yaml:"smarthost,omitempty" json:"smarthost,omitempty"`
// AuthUsername     string               `yaml:"auth_username,omitempty" json:"auth_username,omitempty"`
// AuthPassword     Secret               `yaml:"auth_password,omitempty" json:"auth_password,omitempty"`
// AuthPasswordFile string               `yaml:"auth_password_file,omitempty" json:"auth_password_file,omitempty"`
// AuthSecret       Secret               `yaml:"auth_secret,omitempty" json:"auth_secret,omitempty"`
// AuthIdentity     string               `yaml:"auth_identity,omitempty" json:"auth_identity,omitempty"`
// Headers          map[string]string    `yaml:"headers,omitempty" json:"headers,omitempty"`
// HTML             string               `yaml:"html,omitempty" json:"html,omitempty"`
// Text             string               `yaml:"text,omitempty" json:"text,omitempty"`
// RequireTLS       *bool                `yaml:"require_tls,omitempty" json:"require_tls,omitempty"`
// TLSConfig        *commoncfg.TLSConfig `yaml:"tls_config,omitempty" json:"tls_config,omitempty"`

type Client struct {
	logger    *slog.Logger
	address   *url.URL
	from      *mail.Address
	headers   map[string]string
	hello     string
	auth      Auth
	tls       TLS
	tlsConfig *tls.Config
}

// New returns a new Email notifier.
func New(address string, logger *slog.Logger, opts ...Option) (*Client, error) {
	clientOpts := options{
		from:    "signoz@signoz.localhost",
		headers: make(map[string]string),
		auth:    Auth{},
		tls: TLS{
			Enabled: false,
		},
		hello: "",
	}

	for _, opt := range opts {
		opt(&clientOpts)
	}

	from, err := mail.ParseAddress(clientOpts.from)
	if err != nil {
		return nil, fmt.Errorf("parse 'from' address: %w", err)
	}

	parsedAddressURL, err := url.Parse(address)
	if err != nil {
		return nil, fmt.Errorf("parse 'address': %w", err)
	}

	if clientOpts.headers == nil {
		clientOpts.headers = make(map[string]string)
	}
	clientOpts.headers["From"] = from.String()

	tls, err := newTLSConfig(clientOpts.tls, parsedAddressURL.Host)
	if err != nil {
		return nil, fmt.Errorf("create TLS config: %w", err)
	}

	return &Client{
		logger:    logger,
		address:   parsedAddressURL,
		from:      from,
		headers:   clientOpts.headers,
		hello:     clientOpts.hello,
		auth:      clientOpts.auth,
		tls:       clientOpts.tls,
		tlsConfig: tls,
	}, nil
}

// auth resolves a string of authentication mechanisms.
func (c *Client) smtpAuth(_ context.Context, mechs string) (smtp.Auth, error) {
	username := c.auth.Username

	// If no username is set, keep going without authentication.
	if username == "" {
		return nil, nil
	}

	var errs []error
	for _, mech := range strings.Split(mechs, " ") {
		switch mech {
		case "CRAM-MD5":
			secret := c.auth.Secret
			if secret == "" {
				errs = append(errs, errors.New("missing secret for CRAM-MD5 auth mechanism"))
				continue
			}
			return smtp.CRAMMD5Auth(username, secret), nil

		case "PLAIN":
			password := c.auth.Password
			if password == "" {
				errs = append(errs, errors.New("missing password for PLAIN auth mechanism"))
				continue
			}
			identity := c.auth.Identity

			return smtp.PlainAuth(identity, username, password, c.address.Host), nil
		case "LOGIN":
			password := c.auth.Password
			if password == "" {
				errs = append(errs, errors.New("missing password for PLAIN auth mechanism"))
				continue
			}

			return LoginAuth(username, password), nil
		}
	}

	if len(errs) == 0 {
		errs = append(errs, errors.New("unknown auth mechanism: "+mechs))
	}

	return nil, errors.Join(errs...)
}

func (c *Client) dial(ctx context.Context) (net.Conn, error) {
	var (
		conn net.Conn
		err  error
	)

	if c.tls.Enabled || c.address.Port() == "465" {
		conn, err = tls.Dial("tcp", c.address.String(), c.tlsConfig)
		if err != nil {
			return nil, fmt.Errorf("establish TLS connection to server: %w", err)
		}

		return conn, nil
	}

	var d net.Dialer
	conn, err = d.DialContext(ctx, "tcp", c.address.String())
	if err != nil {
		return nil, fmt.Errorf("establish connection to server: %w", err)
	}

	return conn, nil
}

func newTLSConfig(config TLS, serverName string) (*tls.Config, error) {
	tlsConfig := &tls.Config{
		InsecureSkipVerify: config.InsecureSkipVerify,
		ServerName:         serverName,
	}

	if config.CertFilePath != "" {
		cert, err := tls.LoadX509KeyPair(config.CertFilePath, config.KeyFilePath)
		if err != nil {
			return nil, fmt.Errorf("could not load cert or key file: %w", err)
		}
		tlsConfig.Certificates = []tls.Certificate{cert}
	}

	if config.CAFilePath != "" {
		ca, err := os.ReadFile(config.CAFilePath)
		if err != nil {
			return nil, fmt.Errorf("could not load CA file: %w", err)
		}
		tlsConfig.RootCAs = x509.NewCertPool()
		if !tlsConfig.RootCAs.AppendCertsFromPEM(ca) {
			return nil, fmt.Errorf("could not append CA file: %w", err)
		}
	}

	return tlsConfig, nil
}

// Notify implements the Notifier interface.
func (c *Client) Do(ctx context.Context, tos []*mail.Address, subject string, contentType ContentType, body []byte) error {
	var (
		smtpClient *smtp.Client
		conn       net.Conn
		err        error
		success    = false
	)

	conn, err = c.dial(ctx)
	if err != nil {
		return err
	}

	smtpClient, err = smtp.NewClient(conn, c.address.Host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("create SMTP client: %w", err)
	}

	defer func() {
		// Try to clean up after ourselves but don't log anything if something has failed.
		if err := smtpClient.Quit(); success && err != nil {
			c.logger.Warn("failed to close SMTP connection", "err", err)
		}
	}()

	if c.hello != "" {
		err = smtpClient.Hello(c.hello)
		if err != nil {
			return fmt.Errorf("send EHLO command: %w", err)
		}
	}

	if c.tls.Enabled {
		if ok, _ := smtpClient.Extension("STARTTLS"); !ok {
			return fmt.Errorf("'require_tls' is true (default) but %q does not advertise the STARTTLS extension", c.address)
		}

		if err := smtpClient.StartTLS(c.tlsConfig); err != nil {
			return fmt.Errorf("send STARTTLS command: %w", err)
		}
	}

	if ok, mech := smtpClient.Extension("AUTH"); ok {
		auth, err := c.smtpAuth(ctx, mech)
		if err != nil {
			return fmt.Errorf("find auth mechanism: %w", err)
		}

		if auth != nil {
			if err := smtpClient.Auth(auth); err != nil {
				return fmt.Errorf("%T auth: %w", auth, err)
			}
		}
	}

	for _, addr := range tos {
		if err = smtpClient.Rcpt(addr.Address); err != nil {
			return fmt.Errorf("send RCPT command: %w", err)
		}
	}

	// Send the email headers and body.
	message, err := smtpClient.Data()
	if err != nil {
		return fmt.Errorf("send DATA command: %w", err)
	}
	closeOnce := sync.OnceValue(func() error {
		return message.Close()
	})

	// Close the message when this method exits in order to not leak resources. Even though we're calling this explicitly
	// further down, the method may exit before then.
	defer func() {
		// If we try close an already-closed writer, it'll send a subsequent request to the server which is invalid.
		_ = closeOnce()
	}()

	buffer := &bytes.Buffer{}
	for header, value := range c.headers {
		fmt.Fprintf(buffer, "%s: %s\r\n", header, mime.QEncoding.Encode("utf-8", value))
	}

	at := strings.LastIndex(c.from.Address, "@")
	if at >= 0 {
		fmt.Fprintf(buffer, "Message-Id: %s\r\n", fmt.Sprintf("<%d.%d@%s>", time.Now().UnixNano(), rand.Uint64(), c.from.Address[at+1:]))
	}

	multipartBuffer := &bytes.Buffer{}
	multipartWriter := multipart.NewWriter(multipartBuffer)

	fmt.Fprintf(buffer, "Subject: %s\r\n", subject)
	fmt.Fprintf(buffer, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	fmt.Fprintf(buffer, "Content-Type: multipart/alternative;  boundary=%s\r\n", multipartWriter.Boundary())
	fmt.Fprintf(buffer, "MIME-Version: 1.0\r\n\r\n")

	_, err = message.Write(buffer.Bytes())
	if err != nil {
		return fmt.Errorf("write headers: %w", err)
	}

	if contentType == ContentTypeText {
		// Text template
		w, err := multipartWriter.CreatePart(textproto.MIMEHeader{
			"Content-Transfer-Encoding": {"quoted-printable"},
			"Content-Type":              {"text/plain; charset=UTF-8"},
		})
		if err != nil {
			return fmt.Errorf("create part for text template: %w", err)
		}

		qw := quotedprintable.NewWriter(w)
		_, err = qw.Write([]byte(body))
		if err != nil {
			return fmt.Errorf("write text part: %w", err)
		}
		err = qw.Close()
		if err != nil {
			return fmt.Errorf("close text part: %w", err)
		}
	}

	if contentType == ContentTypeHTML {
		// Html template
		// Preferred alternative placed last per section 5.1.4 of RFC 2046
		// https://www.ietf.org/rfc/rfc2046.txt
		w, err := multipartWriter.CreatePart(textproto.MIMEHeader{
			"Content-Transfer-Encoding": {"quoted-printable"},
			"Content-Type":              {"text/html; charset=UTF-8"},
		})
		if err != nil {
			return fmt.Errorf("create part for html template: %w", err)
		}

		qw := quotedprintable.NewWriter(w)
		_, err = qw.Write([]byte(body))
		if err != nil {
			return fmt.Errorf("write HTML part: %w", err)
		}
		err = qw.Close()
		if err != nil {
			return fmt.Errorf("close HTML part: %w", err)
		}
	}

	err = multipartWriter.Close()
	if err != nil {
		return fmt.Errorf("close multipartWriter: %w", err)
	}

	_, err = message.Write(multipartBuffer.Bytes())
	if err != nil {
		return fmt.Errorf("write body buffer: %w", err)
	}

	// Complete the message and await response.
	if err = closeOnce(); err != nil {
		return fmt.Errorf("delivery failure: %w", err)
	}

	success = true
	return nil
}
