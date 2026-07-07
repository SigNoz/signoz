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

	htmltemplate "html/template"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/templating/markdownrenderer"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	commoncfg "github.com/prometheus/common/config"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	Integration = "email"

	// alertEmailLayoutTemplate is the name of the HTML layout template that
	// wraps the rendered alert bodies. It is loaded into the notification
	// template (n.tmpl) from the alertmanager templates config and lives at
	// templates/alertmanager/email.gotmpl.
	alertEmailLayoutTemplate = "email.signoz.html"
)

// Email implements a Notifier for email notifications.
type Email struct {
	conf      *config.EmailConfig
	tmpl      *template.Template
	logger    *slog.Logger
	hostname  string
	templater alertmanagertypes.Templater
}

// layoutData is the value passed to the email.signoz.html layout
// template. It embeds NotificationTemplateData so templates can reference
// `.Alert.Status`, `.Alert.TotalFiring`, `.Alert.TotalResolved`,
// `.NotificationTemplateData.ExternalURL`, etc. alongside the rendered
// Title and per-alert Bodies.
type layoutData struct {
	alertmanagertypes.NotificationTemplateData
	Title  string
	Bodies []htmltemplate.HTML
}

var errNoAuthUsernameConfigured = errors.NewInternalf(errors.CodeInternal, "no auth username configured")

// New returns a new Email notifier. When the email.signoz.html layout is
// not defined in t, custom-body alerts fall back to plain <div>-wrapped HTML.
func New(c *config.EmailConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater) *Email {
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
	return &Email{conf: c, tmpl: t, logger: l, hostname: h, templater: templater}
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
		if err != nil && !errors.Is(err, errNoAuthUsernameConfigured) {
			return true, errors.WrapInternalf(err, errors.CodeInternal, "find auth mechanism")
		} else if errors.Is(err, errNoAuthUsernameConfigured) {
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

	// Prepare the content for the email. subject, when non-empty, overrides
	// the configured Subject header for this notification only. We deliberately
	// do not mutate n.conf.Headers here: the config map is shared across
	// concurrent notifications to the same receiver.
	subject, htmlBody, err := n.prepareContent(ctx, as)
	if err != nil {
		n.logger.ErrorContext(ctx, "failed to prepare notification content", errors.Attr(err))
		return false, err
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
		if header == "Subject" {
			fmt.Fprintf(buffer, "%s: %s\r\n", header, mime.QEncoding.Encode("utf-8", subject))
			continue
		}
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

	if htmlBody != "" {
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
		qw := quotedprintable.NewWriter(w)
		_, err = qw.Write([]byte(htmlBody))
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

// prepareContent returns a subject override (empty when the default config
// Subject should be used) and the HTML body for the email. Callers must treat
// the subject as local state and never write it back to n.conf.Headers.
func (n *Email) prepareContent(ctx context.Context, alerts []*types.Alert) (string, string, error) {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: n.conf.Headers["Subject"],
		DefaultBodyTemplate:  n.conf.HTML,
	}, alerts)
	if err != nil {
		return "", "", err
	}

	subject := result.Title

	if !result.IsDefaultBody {
		// Custom-body path: render each expanded markdown body to HTML, then
		// wrap the whole thing in the email.signoz.html layout (or fall
		// back to plain <div> wrapping when the layout template is not loaded).
		for i, body := range result.Body {
			if body == "" {
				continue
			}
			rendered, err := markdownrenderer.RenderHTML(body)
			if err != nil {
				return "", "", err
			}
			result.Body[i] = rendered
		}
		appendRelatedLinkButtons(alerts, result.Body)
		html, err := n.renderLayout(result)
		if err != nil {
			n.logger.WarnContext(ctx, "custom email template rendering failed, falling back to plain <div> wrap", errors.Attr(err))
			return subject, wrapBodiesAsDivs(result.Body), nil
		}
		return subject, html, nil
	}

	return subject, result.Body[0], nil
}

// renderLayout wraps result in the email.signoz.html HTML layout loaded
// into n.tmpl from the alertmanager templates config. Returns an error when the
// layout template is not defined (e.g. in tests where no templates are loaded)
// so prepareContent can fall back to plain <div> wrapping.
func (n *Email) renderLayout(result *alertmanagertypes.ExpandResult) (string, error) {
	bodies := make([]htmltemplate.HTML, 0, len(result.Body))
	for _, b := range result.Body {
		bodies = append(bodies, htmltemplate.HTML(b))
	}
	data := layoutData{Title: result.Title, Bodies: bodies}
	if result.NotificationData != nil {
		data.NotificationTemplateData = *result.NotificationData
	}
	html, err := n.tmpl.ExecuteHTMLString(`{{ template "`+alertEmailLayoutTemplate+`" . }}`, data)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "failed to render email layout")
	}
	return html, nil
}

// appendRelatedLinkButtons appends "View Related Logs/Traces" buttons to each
// per-alert body when the rule manager attached the corresponding annotation.
// bodies is positionally aligned with alerts (see alertmanagertemplate.Prepare);
// empty bodies are skipped so we never attach a button to an alert that produced
// no visible content.
func appendRelatedLinkButtons(alerts []*types.Alert, bodies []string) {
	for i := range bodies {
		if i >= len(alerts) || bodies[i] == "" {
			continue
		}
		if link := alerts[i].Annotations[ruletypes.AnnotationRelatedLogs]; link != "" {
			bodies[i] += htmlButton("View Related Logs", string(link))
		}
		if link := alerts[i].Annotations[ruletypes.AnnotationRelatedTraces]; link != "" {
			bodies[i] += htmlButton("View Related Traces", string(link))
		}
	}
}

func wrapBodiesAsDivs(bodies []string) string {
	var b strings.Builder
	for _, part := range bodies {
		if part == "" {
			continue
		}
		b.WriteString("<div>")
		b.WriteString(part)
		b.WriteString("</div>")
	}
	return b.String()
}

func htmlButton(text, url string) string {
	return fmt.Sprintf(`
	<a href="%s" target="_blank" style="text-decoration: none;">
<button style="
    padding: 6px 16px;
    /* Default System Font */
    font-family: sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    /* Light Theme & Dynamic Background (Solid) */
    color: #111827;
    background-color: #f9fafb;
    /* Static Outline */
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
">
  %s
</button>
</a>`, url, text)
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
