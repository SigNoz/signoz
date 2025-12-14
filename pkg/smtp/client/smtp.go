package client

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
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
	"os"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

type Client struct {
	logger    *slog.Logger
	address   string
	host      string
	port      string
	from      *mail.Address
	headers   map[string]string
	hello     string
	auth      Auth
	tls       TLS
	tlsConfig *tls.Config
}

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
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "parse 'from' address: %s", err.Error())
	}

	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "parse 'address': %s", err.Error())
	}

	if clientOpts.headers == nil {
		clientOpts.headers = make(map[string]string)
	}
	clientOpts.headers["From"] = from.String()

	tls, err := newTLSConfig(clientOpts.tls, host)
	if err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "create TLS config: %s", err.Error())
	}

	return &Client{
		logger:    logger,
		address:   address,
		host:      host,
		port:      port,
		from:      from,
		headers:   clientOpts.headers,
		hello:     clientOpts.hello,
		auth:      clientOpts.auth,
		tls:       clientOpts.tls,
		tlsConfig: tls,
	}, nil
}

func (c *Client) Do(ctx context.Context, tos []*mail.Address, subject string, contentType ContentType, body []byte) error {
	var (
		smtpClient *smtp.Client
		conn       net.Conn
		err        error
		success    = false
	)

	// Dial the SMTP server.
	conn, err = c.dial(ctx)
	if err != nil {
		return err
	}

	// Create a new SMTP client.
	smtpClient, err = smtp.NewClient(conn, c.host)
	if err != nil {
		conn.Close()
		return errors.Newf(errors.TypeInternal, errors.CodeInternal, "failed to create SMTP client: %s", err.Error())
	}

	// Try to clean up after ourselves but don't log anything if something has failed.
	defer func() {
		if err := smtpClient.Quit(); success && err != nil {
			c.logger.WarnContext(ctx, "failed to close SMTP connection", "error", err)
		}
	}()

	// Send the EHLO command.
	if c.hello != "" {
		err = smtpClient.Hello(c.hello)
		if err != nil {
			return errors.WrapInternalf(err, errors.CodeInternal, "failed to send EHLO command")
		}
	}

	// If TLS is not enabled, check if the server supports STARTTLS.
	if !c.tls.Enabled {
		if ok, _ := smtpClient.Extension("STARTTLS"); ok {
			if err := smtpClient.StartTLS(c.tlsConfig); err != nil {
				return errors.WrapInternalf(err, errors.CodeInternal, "failed to send STARTTLS command")
			}
		}
	}

	// If the server supports the AUTH command,
	if ok, mech := smtpClient.Extension("AUTH"); ok {
		// If the username is set, find the appropriate authentication mechanism.
		if c.auth.Username != "" {
			auth, err := c.smtpAuth(ctx, mech)
			if err != nil {
				return errors.WrapInternalf(err, errors.CodeInternal, "failed to find auth mechanism")
			}

			// Send the AUTH command.
			if err := smtpClient.Auth(auth); err != nil {
				return errors.WrapInternalf(err, errors.CodeInternal, "failed to auth: %T", auth)
			}
		}
	}

	// Send the MAIL command.
	if err = smtpClient.Mail(c.from.Address); err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to send MAIL command")
	}

	// Send the RCPT command for each recipient.
	for _, addr := range tos {
		if err = smtpClient.Rcpt(addr.Address); err != nil {
			return errors.WrapInternalf(err, errors.CodeInternal, "failed to send RCPT command")
		}
	}

	// Send the email headers and body.
	message, err := smtpClient.Data()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to send DATA command")
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

	tosAsStrings := make([]string, len(tos))
	for i, to := range tos {
		tosAsStrings[i] = to.String()
	}
	fmt.Fprintf(buffer, "To: %s\r\n", strings.Join(tosAsStrings, ","))
	fmt.Fprintf(buffer, "Subject: %s\r\n", subject)
	fmt.Fprintf(buffer, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	fmt.Fprintf(buffer, "Content-Type: multipart/alternative;  boundary=%s\r\n", multipartWriter.Boundary())
	fmt.Fprintf(buffer, "MIME-Version: 1.0\r\n\r\n")

	_, err = message.Write(buffer.Bytes())
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to write headers")
	}

	// Text template
	if contentType == ContentTypeText {
		w, err := multipartWriter.CreatePart(textproto.MIMEHeader{
			"Content-Transfer-Encoding": {"quoted-printable"},
			"Content-Type":              {"text/plain; charset=UTF-8"},
		})
		if err != nil {
			return errors.WrapInternalf(err, errors.CodeInternal, "failed to create part for text template")
		}

		qw := quotedprintable.NewWriter(w)
		_, err = qw.Write([]byte(body))
		if err != nil {
			return errors.WrapInternalf(err, errors.CodeInternal, "failed to write text part")
		}
		err = qw.Close()
		if err != nil {
			return errors.WrapInternalf(err, errors.CodeInternal, "failed to close text part")
		}
	}

	// Html template
	// Preferred alternative placed last per section 5.1.4 of RFC 2046
	// https://www.ietf.org/rfc/rfc2046.txt
	if contentType == ContentTypeHTML {
		w, err := multipartWriter.CreatePart(textproto.MIMEHeader{
			"Content-Transfer-Encoding": {"quoted-printable"},
			"Content-Type":              {"text/html; charset=UTF-8"},
		})
		if err != nil {
			return errors.WrapInternalf(err, errors.CodeInternal, "failed to create part for html template")
		}

		qw := quotedprintable.NewWriter(w)
		_, err = qw.Write([]byte(body))
		if err != nil {
			return errors.WrapInternalf(err, errors.CodeInternal, "failed to write HTML part")
		}
		err = qw.Close()
		if err != nil {
			return errors.WrapInternalf(err, errors.CodeInternal, "failed to close HTML part")
		}
	}

	err = multipartWriter.Close()
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to close multipartWriter")
	}

	_, err = message.Write(multipartBuffer.Bytes())
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to write body buffer")
	}

	// Complete the message and await response.
	if err = closeOnce(); err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "failed to deliver")
	}

	success = true
	return nil
}

// auth resolves a string of authentication mechanisms.
func (c *Client) smtpAuth(_ context.Context, mechs string) (smtp.Auth, error) {
	username := c.auth.Username

	var errs []error
	for _, mech := range strings.Split(mechs, " ") {
		switch mech {
		case "CRAM-MD5":
			secret := c.auth.Secret
			if secret == "" {
				errs = append(errs, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "missing secret for CRAM-MD5 auth mechanism"))
				continue
			}
			return smtp.CRAMMD5Auth(username, secret), nil

		case "PLAIN":
			password := c.auth.Password
			if password == "" {
				errs = append(errs, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "missing password for PLAIN auth mechanism"))
				continue
			}
			identity := c.auth.Identity

			return smtp.PlainAuth(identity, username, password, c.host), nil
		case "LOGIN":
			password := c.auth.Password
			if password == "" {
				errs = append(errs, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "missing password for LOGIN auth mechanism"))
				continue
			}

			return LoginAuth(username, password), nil
		}
	}

	if len(errs) == 0 {
		errs = append(errs, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "unknown auth mechanism: "+mechs))
	}

	return nil, errors.Join(errs...)
}

func (c *Client) dial(ctx context.Context) (net.Conn, error) {
	var (
		conn net.Conn
		err  error
	)

	if c.tls.Enabled || c.port == "465" {
		conn, err = tls.Dial("tcp", c.address, c.tlsConfig)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to establish TLS connection to server")
		}

		return conn, nil
	}

	var d net.Dialer
	conn, err = d.DialContext(ctx, "tcp", c.address)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to establish connection to server")
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
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to load cert or key file")
		}
		tlsConfig.Certificates = []tls.Certificate{cert}
	}

	if config.CAFilePath != "" {
		ca, err := os.ReadFile(config.CAFilePath)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to load CA file")
		}
		tlsConfig.RootCAs = x509.NewCertPool()
		if !tlsConfig.RootCAs.AppendCertsFromPEM(ca) {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to append CA file: %s", config.CAFilePath)
		}
	}

	return tlsConfig, nil
}
