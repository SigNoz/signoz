// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2019 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package email

import (
	"bytes"
	"context"
	"crypto/tls"
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
	commoncfg "github.com/prometheus/common/config"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	Integration = "email"
)

// Email implements a Notifier for email notifications.
type Email struct {
	conf     *config.EmailConfig
	tmpl     *template.Template
	logger   *slog.Logger
	hostname string
}

var errNoAuthUsernameConfigured = errors.NewInternalf(errors.CodeInternal, "no auth username configured")

// New returns a new Email notifier.
func New(c *config.EmailConfig, t *template.Template, l *slog.Logger) *Email {
	if _, ok := c.Headers["Subject"]; !ok {
		c.Headers["Subject"] = config.DefaultEmailSubject
	}
	if _, ok := c.Headers["To"]; !ok {
		c.Headers["To"] = c.To
	}
	if _, ok := c.Headers["From"]; !ok {
		c.Headers["From"] = c.From
	}

	h, err := os.Hostname()
	// If we can't get the hostname, we'll use localhost
	if err != nil {
		h = "localhost.localdomain"
	}
	return &Email{conf: c, tmpl: t, logger: l, hostname: h}
}

// auth resolves a string of authentication mechanisms.
func (n *Email) auth(mechs string) (smtp.Auth, error) {
	username := n.conf.AuthUsername

	// If no username is set, return custom error which can be ignored if needed.
	if strings.TrimSpace(username) == "" {
		return nil, errNoAuthUsernameConfigured
	}

	var errs error
	for mech := range strings.SplitSeq(mechs, " ") {
		switch mech {
		case "CRAM-MD5":
			secret, secretErr := n.getAuthSecret()
			if secretErr != nil {
				errs = errors.Join(errs, secretErr)
				continue
			}
			if secret == "" {
				errs = errors.Join(errs, errors.NewInternalf(errors.CodeInternal, "missing secret for CRAM-MD5 auth mechanism"))
				continue
			}
			return smtp.CRAMMD5Auth(username, secret), nil

		case "PLAIN":
			password, passwordErr := n.getPassword()
			if passwordErr != nil {
				errs = errors.Join(errs, passwordErr)
				continue
			}
			if password == "" {
				errs = errors.Join(errs, errors.NewInternalf(errors.CodeInternal, "missing password for PLAIN auth mechanism"))
				continue
			}
			return smtp.PlainAuth(n.conf.AuthIdentity, username, password, n.conf.Smarthost.Host), nil
		case "LOGIN":
			password, passwordErr := n.getPassword()
			if passwordErr != nil {
				errs = errors.Join(errs, passwordErr)
				continue
			}
			if password == "" {
				errs = errors.Join(errs, errors.NewInternalf(errors.CodeInternal, "missing password for LOGIN auth mechanism"))
				continue
			}
			return LoginAuth(username, password), nil
		default:
			errs = errors.Join(errs, errors.NewInternalf(errors.CodeUnsupported, "unknown auth mechanism: %s", mech))
		}
	}
	return nil, errs
}

// Notify implements the Notifier interface.
func (n *Email) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {
	var (
		c       *smtp.Client
		conn    net.Conn
		err     error
		success = false
	)
	// Determine whether to use Implicit TLS
	var useImplicitTLS bool
	if n.conf.ForceImplicitTLS != nil {
		useImplicitTLS = *n.conf.ForceImplicitTLS
	} else {
		// Default logic: port 465 uses implicit TLS (backward compatibility)
		useImplicitTLS = n.conf.Smarthost.Port == "465"
	}

	if useImplicitTLS {
		tlsConfig, err := commoncfg.NewTLSConfig(n.conf.TLSConfig)
		if err != nil {
			return false, errors.WrapInternalf(err, errors.CodeInternal, "parse TLS configuration")
		}
		if tlsConfig.ServerName == "" {
			tlsConfig.ServerName = n.conf.Smarthost.Host
		}

		conn, err = tls.Dial("tcp", n.conf.Smarthost.String(), tlsConfig)
		if err != nil {
			return true, errors.WrapInternalf(err, errors.CodeInternal, "establish TLS connection to server")
		}
	} else {
		var (
			d   = net.Dialer{}
			err error
		)
		conn, err = d.DialContext(ctx, "tcp", n.conf.Smarthost.String())
		if err != nil {
			return true, errors.WrapInternalf(err, errors.CodeInternal, "establish connection to server")
		}
	}
	c, err = smtp.NewClient(conn, n.conf.Smarthost.Host)
	if err != nil {
		conn.Close()
		return true, errors.WrapInternalf(err, errors.CodeInternal, "create SMTP client")
	}
	defer func() {
		// Try to clean up after ourselves but don't log anything if something has failed.
		if err := c.Quit(); success && err != nil {
			n.logger.WarnContext(ctx, "failed to close SMTP connection", slog.Any("err", err))
		}
	}()

	if n.conf.Hello != "" {
		err = c.Hello(n.conf.Hello)
		if err != nil {
			return true, errors.WrapInternalf(err, errors.CodeInternal, "send EHLO command")
		}
	}

	// Global Config guarantees RequireTLS is not nil.
	if *n.conf.RequireTLS && !useImplicitTLS {
		if ok, _ := c.Extension("STARTTLS"); !ok {
			return true, errors.WrapInternalf(err, errors.CodeInternal, "'require_tls' is true (default) but %q does not advertise the STARTTLS extension", n.conf.Smarthost)
		}

		tlsConf, err := commoncfg.NewTLSConfig(n.conf.TLSConfig)
		if err != nil {
			return false, errors.WrapInternalf(err, errors.CodeInternal, "parse TLS configuration")
		}
		if tlsConf.ServerName == "" {
			tlsConf.ServerName = n.conf.Smarthost.Host
		}

		if err := c.StartTLS(tlsConf); err != nil {
			return true, errors.WrapInternalf(err, errors.CodeInternal, "send STARTTLS command")
		}
	}

	if ok, mech := c.Extension("AUTH"); ok {
		auth, err := n.auth(mech)
		if err != nil && err != errNoAuthUsernameConfigured {
			return true, errors.WrapInternalf(err, errors.CodeInternal, "find auth mechanism")
		} else if err == errNoAuthUsernameConfigured {
			n.logger.DebugContext(ctx, "no auth username configured. Attempting to send email without authenticating")
		}
		if auth != nil {
			if err := c.Auth(auth); err != nil {
				return true, errors.WrapInternalf(err, errors.CodeInternal, "%T auth", auth)
			}
		}
	}

	var (
		tmplErr error
		data    = notify.GetTemplateData(ctx, n.tmpl, as, n.logger)
		tmpl    = notify.TmplText(n.tmpl, data, &tmplErr)
	)
	from := tmpl(n.conf.From)
	if tmplErr != nil {
		return false, errors.WrapInternalf(tmplErr, errors.CodeInternal, "execute 'from' template")
	}
	to := tmpl(n.conf.To)
	if tmplErr != nil {
		return false, errors.WrapInternalf(tmplErr, errors.CodeInternal, "execute 'to' template")
	}

	addrs, err := mail.ParseAddressList(from)
	if err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "parse 'from' addresses")
	}
	if len(addrs) != 1 {
		return false, errors.NewInternalf(errors.CodeInternal, "must be exactly one 'from' address (got: %d)", len(addrs))
	}
	if err = c.Mail(addrs[0].Address); err != nil {
		return true, errors.WrapInternalf(err, errors.CodeInternal, "send MAIL command")
	}
	addrs, err = mail.ParseAddressList(to)
	if err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "parse 'to' addresses")
	}
	for _, addr := range addrs {
		if err = c.Rcpt(addr.Address); err != nil {
			return true, errors.WrapInternalf(err, errors.CodeInternal, "send RCPT command")
		}
	}

	// Send the email headers and body.
	message, err := c.Data()
	if err != nil {
		return true, errors.WrapInternalf(err, errors.CodeInternal, "send DATA command")
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
	for header, t := range n.conf.Headers {
		value, err := n.tmpl.ExecuteTextString(t, data)
		if err != nil {
			return false, errors.WrapInternalf(err, errors.CodeInternal, "execute %q header template", header)
		}
		fmt.Fprintf(buffer, "%s: %s\r\n", header, mime.QEncoding.Encode("utf-8", value))
	}

	if _, ok := n.conf.Headers["Message-Id"]; !ok {
		fmt.Fprintf(buffer, "Message-Id: %s\r\n", fmt.Sprintf("<%d.%d@%s>", time.Now().UnixNano(), rand.Uint64(), n.hostname))
	}

	if n.conf.Threading.Enabled {
		key, err := notify.ExtractGroupKey(ctx)
		if err != nil {
			return false, err
		}
		// Add threading headers. All notifications for the same alert group
		// (identified by key hash) are threaded together.
		threadBy := ""
		if n.conf.Threading.ThreadByDate != "none" {
			// ThreadByDate is 'daily':
			// Use current date so all mails for this alert today thread together.
			threadBy = time.Now().Format("2006-01-02")
		}
		keyHash := key.Hash()
		if len(keyHash) > 16 {
			keyHash = keyHash[:16]
		}
		// The thread root ID is a Message-ID that doesn't correspond to
		// any actual email. Email clients following the (commonly used) JWZ
		// algorithm will create a dummy container to group these messages.
		threadRootID := fmt.Sprintf("<alert-%s-%s@alertmanager>", keyHash, threadBy)
		fmt.Fprintf(buffer, "References: %s\r\n", threadRootID)
		fmt.Fprintf(buffer, "In-Reply-To: %s\r\n", threadRootID)
	}

	multipartBuffer := &bytes.Buffer{}
	multipartWriter := multipart.NewWriter(multipartBuffer)

	fmt.Fprintf(buffer, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	fmt.Fprintf(buffer, "Content-Type: multipart/alternative;  boundary=%s\r\n", multipartWriter.Boundary())
	fmt.Fprintf(buffer, "MIME-Version: 1.0\r\n\r\n")

	// TODO: Add some useful headers here, such as URL of the alertmanager
	// and active/resolved.
	_, err = message.Write(buffer.Bytes())
	if err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "write headers")
	}

	if len(n.conf.Text) > 0 {
		// Text template
		w, err := multipartWriter.CreatePart(textproto.MIMEHeader{
			"Content-Transfer-Encoding": {"quoted-printable"},
			"Content-Type":              {"text/plain; charset=UTF-8"},
		})
		if err != nil {
			return false, errors.WrapInternalf(err, errors.CodeInternal, "create part for text template")
		}
		body, err := n.tmpl.ExecuteTextString(n.conf.Text, data)
		if err != nil {
			return false, errors.WrapInternalf(err, errors.CodeInternal, "execute text template")
		}
		qw := quotedprintable.NewWriter(w)
		_, err = qw.Write([]byte(body))
		if err != nil {
			return true, errors.WrapInternalf(err, errors.CodeInternal, "write text part")
		}
		err = qw.Close()
		if err != nil {
			return true, errors.WrapInternalf(err, errors.CodeInternal, "close text part")
		}
	}

	if len(n.conf.HTML) > 0 {
		// Html template
		// Preferred alternative placed last per section 5.1.4 of RFC 2046
		// https://www.ietf.org/rfc/rfc2046.txt
		w, err := multipartWriter.CreatePart(textproto.MIMEHeader{
			"Content-Transfer-Encoding": {"quoted-printable"},
			"Content-Type":              {"text/html; charset=UTF-8"},
		})
		if err != nil {
			return false, errors.WrapInternalf(err, errors.CodeInternal, "create part for html template")
		}
		body, err := n.tmpl.ExecuteHTMLString(n.conf.HTML, data)
		if err != nil {
			return false, errors.WrapInternalf(err, errors.CodeInternal, "execute html template")
		}
		qw := quotedprintable.NewWriter(w)
		_, err = qw.Write([]byte(body))
		if err != nil {
			return true, errors.WrapInternalf(err, errors.CodeInternal, "write HTML part")
		}
		err = qw.Close()
		if err != nil {
			return true, errors.WrapInternalf(err, errors.CodeInternal, "close HTML part")
		}
	}

	err = multipartWriter.Close()
	if err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "close multipartWriter")
	}

	_, err = message.Write(multipartBuffer.Bytes())
	if err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "write body buffer")
	}

	// Complete the message and await response.
	if err = closeOnce(); err != nil {
		return true, errors.WrapInternalf(err, errors.CodeInternal, "delivery failure")
	}

	success = true
	return false, nil
}

type loginAuth struct {
	username, password string
}

func LoginAuth(username, password string) smtp.Auth {
	return &loginAuth{username, password}
}

func (a *loginAuth) Start(server *smtp.ServerInfo) (string, []byte, error) {
	return "LOGIN", []byte{}, nil
}

// Used for AUTH LOGIN. (Maybe password should be encrypted).
func (a *loginAuth) Next(fromServer []byte, more bool) ([]byte, error) {
	if more {
		switch strings.ToLower(string(fromServer)) {
		case "username:":
			return []byte(a.username), nil
		case "password:":
			return []byte(a.password), nil
		default:
			return nil, errors.NewInternalf(errors.CodeInternal, "unexpected server challenge")
		}
	}
	return nil, nil
}

func (n *Email) getPassword() (string, error) {
	if len(n.conf.AuthPasswordFile) > 0 {
		content, err := os.ReadFile(n.conf.AuthPasswordFile)
		if err != nil {
			return "", errors.NewInternalf(errors.CodeInternal, "could not read %s: %v", n.conf.AuthPasswordFile, err)
		}
		return strings.TrimSpace(string(content)), nil
	}
	return string(n.conf.AuthPassword), nil
}

func (n *Email) getAuthSecret() (string, error) {
	if len(n.conf.AuthSecretFile) > 0 {
		content, err := os.ReadFile(n.conf.AuthSecretFile)
		if err != nil {
			return "", errors.NewInternalf(errors.CodeInternal, "could not read %s: %v", n.conf.AuthSecretFile, err)
		}
		return string(content), nil
	}
	return string(n.conf.AuthSecret), nil
}
