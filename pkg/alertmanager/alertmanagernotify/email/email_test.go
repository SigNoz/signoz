package email

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/emersion/go-smtp"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/prometheus/common/promslog"

	// nolint:depguard // require cannot be called outside the main goroutine: https://pkg.go.dev/testing#T.FailNow
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v2"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	emailNoAuthConfigVar = "EMAIL_NO_AUTH_CONFIG"
	emailAuthConfigVar   = "EMAIL_AUTH_CONFIG"

	emailTo   = "alerts@example.com"
	emailFrom = "alertmanager@example.com"
)

// email represents an email returned by the MailDev REST API.
// See https://github.com/djfarrelly/MailDev/blob/master/docs/rest.md.
type email struct {
	To      []map[string]string
	From    []map[string]string
	Subject string
	HTML    *string
	Text    *string
	Headers map[string]string
}

// mailDev is a client for the MailDev server.
type mailDev struct {
	*url.URL
}

func (m *mailDev) UnmarshalYAML(unmarshal func(any) error) error {
	var s string
	if err := unmarshal(&s); err != nil {
		return err
	}
	urlp, err := url.Parse(s)
	if err != nil {
		return err
	}
	m.URL = urlp
	return nil
}

// getLastEmail returns the last received email.
func (m *mailDev) getLastEmail(t *testing.T) (*email, error) {
	// The maildev API might be async. Waiting resolves some issues with flakes.
	time.Sleep(100 * time.Millisecond)
	code, b, err := m.doEmailRequest(http.MethodGet, "/email")
	if err != nil {
		return nil, err
	}
	if code != http.StatusOK {
		return nil, errors.NewInternalf(errors.CodeInternal, "expected status OK, got %d", code)
	}

	t.Logf("Raw email data (getLastEmail): %s", string(b))
	var emails []email
	err = yaml.Unmarshal(b, &emails)
	if err != nil {
		return nil, err
	}
	if len(emails) == 0 {
		return nil, errors.NewInternalf(errors.CodeInternal, "email not found")
	}
	return &emails[len(emails)-1], nil
}

// deleteAllEmails deletes all emails.
func (m *mailDev) deleteAllEmails() error {
	_, _, err := m.doEmailRequest(http.MethodDelete, "/email/all")
	return err
}

// doEmailRequest makes a request to the MailDev API.
func (m *mailDev) doEmailRequest(method, path string) (int, []byte, error) {
	req, err := http.NewRequest(method, fmt.Sprintf("%s://%s%s", m.Scheme, m.Host, path), nil)
	if err != nil {
		return 0, nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	req = req.WithContext(ctx)
	defer cancel()
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer res.Body.Close()
	b, err := io.ReadAll(res.Body)
	if err != nil {
		return 0, nil, err
	}
	return res.StatusCode, b, nil
}

// emailTestConfig is the configuration for the tests.
type emailTestConfig struct {
	Smarthost config.HostPort `yaml:"smarthost"`
	Username  string          `yaml:"username"`
	Password  string          `yaml:"password"`
	Server    *mailDev        `yaml:"server"`
}

func loadEmailTestConfiguration(f string) (emailTestConfig, error) {
	c := emailTestConfig{}
	b, err := os.ReadFile(f)
	if err != nil {
		return c, err
	}

	err = yaml.UnmarshalStrict(b, &c)
	if err != nil {
		return c, err
	}

	return c, nil
}

func notifyEmail(t *testing.T, cfg *config.EmailConfig, server *mailDev) (*email, bool, error) {
	return notifyEmailWithContext(context.Background(), t, cfg, server)
}

// notifyEmailWithContext sends a notification with one firing alert and retrieves the
// email from the SMTP server if the notification has been successfully delivered.
func notifyEmailWithContext(ctx context.Context, t *testing.T, cfg *config.EmailConfig, server *mailDev) (*email, bool, error) {
	tmpl, firingAlert, err := prepare(cfg)
	if err != nil {
		return nil, false, err
	}

	err = server.deleteAllEmails()
	if err != nil {
		return nil, false, err
	}

	email := New(cfg, tmpl, promslog.NewNopLogger())

	retry, err := email.Notify(ctx, firingAlert)
	if err != nil {
		return nil, retry, err
	}

	e, err := server.getLastEmail(t)
	if err != nil {
		return nil, retry, err
	} else if e == nil {
		return nil, retry, errors.NewInternalf(errors.CodeInternal, "email not found")
	}
	return e, retry, nil
}

func prepare(cfg *config.EmailConfig) (*template.Template, *types.Alert, error) {
	if cfg == nil {
		panic("nil config passed")
	}

	if cfg.RequireTLS == nil {
		cfg.RequireTLS = new(bool)
	}
	if cfg.Headers == nil {
		cfg.Headers = make(map[string]string)
	}

	tmpl, err := template.FromGlobs([]string{})
	if err != nil {
		return nil, nil, err
	}
	tmpl.ExternalURL, _ = url.Parse("http://am")

	firingAlert := &types.Alert{
		Alert: model.Alert{
			Labels:   model.LabelSet{},
			StartsAt: time.Now(),
			EndsAt:   time.Now().Add(time.Hour),
		},
	}
	return tmpl, firingAlert, nil
}

// TestEmailNotifyWithErrors tries to send emails with buggy inputs.
func TestEmailNotifyWithErrors(t *testing.T) {
	cfgFile := os.Getenv(emailNoAuthConfigVar)
	if len(cfgFile) == 0 {
		t.Skipf("%s not set", emailNoAuthConfigVar)
	}

	c, err := loadEmailTestConfiguration(cfgFile)
	if err != nil {
		t.Fatal(err)
	}

	for _, tc := range []struct {
		title     string
		updateCfg func(*config.EmailConfig)

		errMsg   string
		hasEmail bool
	}{
		{
			title: "invalid 'from' template",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.From = `{{ template "invalid" }}`
			},
			errMsg: "execute 'from' template:",
		},
		{
			title: "invalid 'from' address",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.From = `xxx`
			},
			errMsg: "parse 'from' addresses:",
		},
		{
			title: "invalid 'to' template",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.To = `{{ template "invalid" }}`
			},
			errMsg: "execute 'to' template:",
		},
		{
			title: "invalid 'to' address",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.To = `xxx`
			},
			errMsg: "parse 'to' addresses:",
		},
		{
			title: "invalid 'subject' template",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.Headers["subject"] = `{{ template "invalid" }}`
			},
			errMsg:   `execute "subject" header template:`,
			hasEmail: true,
		},
		{
			title: "invalid 'text' template",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.Text = `{{ template "invalid" }}`
			},
			errMsg:   `execute text template:`,
			hasEmail: true,
		},
		{
			title: "invalid 'html' template",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.HTML = `{{ template "invalid" }}`
			},
			errMsg:   `execute html template:`,
			hasEmail: true,
		},
	} {
		t.Run(tc.title, func(t *testing.T) {
			if len(tc.errMsg) == 0 {
				t.Fatal("please define the expected error message")
				return
			}

			emailCfg := &config.EmailConfig{
				Smarthost: c.Smarthost,
				To:        emailTo,
				From:      emailFrom,
				HTML:      "HTML body",
				Text:      "Text body",
				Headers: map[string]string{
					"Subject": "{{ len .Alerts }} {{ .Status }} alert(s)",
				},
			}
			if tc.updateCfg != nil {
				tc.updateCfg(emailCfg)
			}

			_, retry, err := notifyEmail(t, emailCfg, c.Server)
			require.Error(t, err)
			require.Contains(t, err.Error(), tc.errMsg)
			require.False(t, retry)

			e, err := c.Server.getLastEmail(t)
			require.NoError(t, err)
			if tc.hasEmail {
				require.NotNil(t, e)
			} else {
				require.Nil(t, e)
			}
		})
	}
}

// TestEmailNotifyWithDoneContext tries to send an email with a context that is done.
func TestEmailNotifyWithDoneContext(t *testing.T) {
	cfgFile := os.Getenv(emailNoAuthConfigVar)
	if len(cfgFile) == 0 {
		t.Skipf("%s not set", emailNoAuthConfigVar)
	}

	c, err := loadEmailTestConfiguration(cfgFile)
	if err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, _, err = notifyEmailWithContext(
		ctx,
		t,
		&config.EmailConfig{
			Smarthost: c.Smarthost,
			To:        emailTo,
			From:      emailFrom,
			HTML:      "HTML body",
			Text:      "Text body",
		},
		c.Server,
	)
	require.Error(t, err)
	require.Contains(t, err.Error(), "establish connection to server")
}

// TestEmailNotifyWithoutAuthentication sends an email to an instance of
// MailDev configured with no authentication then it checks that the server has
// successfully processed the email.
func TestEmailNotifyWithoutAuthentication(t *testing.T) {
	cfgFile := os.Getenv(emailNoAuthConfigVar)
	if len(cfgFile) == 0 {
		t.Skipf("%s not set", emailNoAuthConfigVar)
	}

	c, err := loadEmailTestConfiguration(cfgFile)
	if err != nil {
		t.Fatal(err)
	}

	mail, _, err := notifyEmail(
		t,
		&config.EmailConfig{
			Smarthost: c.Smarthost,
			To:        emailTo,
			From:      emailFrom,
			HTML:      "HTML body",
			Text:      "Text body",
		},
		c.Server,
	)
	require.NoError(t, err)
	var (
		foundMsgID bool
		headers    []string
	)
	for k := range mail.Headers {
		if strings.ToLower(k) == "message-id" {
			foundMsgID = true
			break
		}
		headers = append(headers, k)
	}
	require.True(t, foundMsgID, "Couldn't find 'message-id' in %v", headers)
}

// TestEmailNotifyWithSTARTTLS connects to the server, upgrades the connection
// to TLS, sends an email then it checks that the server has successfully
// processed the email.
// MailDev doesn't support STARTTLS and authentication at the same time so it
// is the only way to test successful STARTTLS.
func TestEmailNotifyWithSTARTTLS(t *testing.T) {
	t.Skip("Skipping test as STARTTLS is funky with MailDev, see https://github.com/maildev/maildev/pull/469")
	cfgFile := os.Getenv(emailNoAuthConfigVar)
	if len(cfgFile) == 0 {
		t.Skipf("%s not set", emailNoAuthConfigVar)
	}

	c, err := loadEmailTestConfiguration(cfgFile)
	if err != nil {
		t.Fatal(err)
	}

	trueVar := true
	_, _, err = notifyEmail(
		t,
		&config.EmailConfig{
			Smarthost:  c.Smarthost,
			To:         emailTo,
			From:       emailFrom,
			HTML:       "HTML body",
			Text:       "Text body",
			RequireTLS: &trueVar,
			// MailDev embeds a self-signed certificate which can't be retrieved.
			TLSConfig: &commoncfg.TLSConfig{InsecureSkipVerify: true},
		},
		c.Server,
	)
	require.NoError(t, err)
}

// TestEmailNotifyWithAuthentication sends emails to an instance of MailDev
// configured with authentication.
func TestEmailNotifyWithAuthentication(t *testing.T) {
	cfgFile := os.Getenv(emailAuthConfigVar)
	if len(cfgFile) == 0 {
		t.Skipf("%s not set", emailAuthConfigVar)
	}

	c, err := loadEmailTestConfiguration(cfgFile)
	if err != nil {
		t.Fatal(err)
	}

	td := t.TempDir()
	fileWithCorrectPassword, err := os.CreateTemp(td, "smtp-password-correct")
	require.NoError(t, err, "creating temp file failed")
	_, err = fileWithCorrectPassword.WriteString(c.Password)
	require.NoError(t, err, "writing to temp file failed")

	fileWithIncorrectPassword, err := os.CreateTemp(td, "smtp-password-incorrect")
	require.NoError(t, err, "creating temp file failed")
	_, err = fileWithIncorrectPassword.WriteString(c.Password + "wrong")
	require.NoError(t, err, "writing to temp file failed")

	for _, tc := range []struct {
		title     string
		updateCfg func(*config.EmailConfig)

		errMsg string
		retry  bool
	}{
		{
			title: "email with authentication",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthUsername = c.Username
				cfg.AuthPassword = config.Secret(c.Password)
			},
		},
		{
			title: "email with authentication (password from file)",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthUsername = c.Username
				cfg.AuthPasswordFile = fileWithCorrectPassword.Name()
			},
		},
		{
			title: "HTML-only email",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthUsername = c.Username
				cfg.AuthPassword = config.Secret(c.Password)
				cfg.Text = ""
			},
		},
		{
			title: "text-only email",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthUsername = c.Username
				cfg.AuthPassword = config.Secret(c.Password)
				cfg.HTML = ""
			},
		},
		{
			title: "multiple To addresses",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthUsername = c.Username
				cfg.AuthPassword = config.Secret(c.Password)
				cfg.To = strings.Join([]string{emailTo, emailFrom}, ",")
			},
		},
		{
			title: "no more than one From address",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthUsername = c.Username
				cfg.AuthPassword = config.Secret(c.Password)
				cfg.From = strings.Join([]string{emailFrom, emailTo}, ",")
			},

			errMsg: "must be exactly one 'from' address",
			retry:  false,
		},
		{
			title: "wrong credentials",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthUsername = c.Username
				cfg.AuthPassword = config.Secret(c.Password + "wrong")
			},

			errMsg: "Invalid username or password",
			retry:  true,
		},
		{
			title: "wrong credentials (password from file)",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthUsername = c.Username
				cfg.AuthPasswordFile = fileWithIncorrectPassword.Name()
			},

			errMsg: "Invalid username or password",
			retry:  true,
		},
		{
			title: "wrong credentials (missing password file)",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthUsername = c.Username
				cfg.AuthPasswordFile = "/does/not/exist"
			},

			errMsg: "could not read",
			retry:  true,
		},
		{
			title:  "no credentials",
			errMsg: "authentication Required",
			retry:  true,
		},
		{
			title: "try to enable STARTTLS",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.RequireTLS = new(bool)
				*cfg.RequireTLS = true
			},

			errMsg: "does not advertise the STARTTLS extension",
			retry:  true,
		},
		{
			title: "invalid Hello string",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthUsername = c.Username
				cfg.AuthPassword = config.Secret(c.Password)
				cfg.Hello = "invalid hello string"
			},

			errMsg: "501 Error",
			retry:  true,
		},
	} {
		t.Run(tc.title, func(t *testing.T) {
			emailCfg := &config.EmailConfig{
				Smarthost: c.Smarthost,
				To:        emailTo,
				From:      emailFrom,
				HTML:      "HTML body",
				Text:      "Text body",
				Headers: map[string]string{
					"Subject": "{{ len .Alerts }} {{ .Status }} alert(s)",
				},
			}
			if tc.updateCfg != nil {
				tc.updateCfg(emailCfg)
			}

			e, retry, err := notifyEmail(t, emailCfg, c.Server)
			if len(tc.errMsg) > 0 {
				require.Error(t, err)
				require.Contains(t, err.Error(), tc.errMsg)
				require.Equal(t, tc.retry, retry)
				return
			}
			require.NoError(t, err)

			require.Equal(t, "1 firing alert(s)", e.Subject)

			getAddresses := func(addresses []map[string]string) []string {
				res := make([]string, 0, len(addresses))
				for _, addr := range addresses {
					res = append(res, addr["address"])
				}
				return res
			}
			to := getAddresses(e.To)
			from := getAddresses(e.From)
			require.Equal(t, strings.Split(emailCfg.To, ","), to)
			require.Equal(t, strings.Split(emailCfg.From, ","), from)

			if len(emailCfg.HTML) > 0 {
				require.Equal(t, emailCfg.HTML, *e.HTML)
			} else {
				require.Nil(t, e.HTML)
			}

			if len(emailCfg.Text) > 0 {
				require.Equal(t, emailCfg.Text, *e.Text)
			} else {
				require.Nil(t, e.Text)
			}
		})
	}
}

func TestEmailConfigNoAuthMechs(t *testing.T) {
	email := &Email{
		conf: &config.EmailConfig{AuthUsername: "test"}, tmpl: &template.Template{}, logger: promslog.NewNopLogger(),
	}
	_, err := email.auth("")
	require.Error(t, err)
	require.Equal(t, "unknown auth mechanism: ", err.Error())
}

func TestEmailConfigMissingAuthParam(t *testing.T) {
	conf := &config.EmailConfig{AuthUsername: "test"}
	email := &Email{
		conf: conf, tmpl: &template.Template{}, logger: promslog.NewNopLogger(),
	}
	_, err := email.auth("CRAM-MD5")
	require.Error(t, err)
	require.Equal(t, "missing secret for CRAM-MD5 auth mechanism", err.Error())

	_, err = email.auth("PLAIN")
	require.Error(t, err)
	require.Equal(t, "missing password for PLAIN auth mechanism", err.Error())

	_, err = email.auth("LOGIN")
	require.Error(t, err)
	require.Equal(t, "missing password for LOGIN auth mechanism", err.Error())

	_, err = email.auth("PLAIN LOGIN")
	require.Error(t, err)
	require.Equal(t, "missing password for PLAIN auth mechanism; missing password for LOGIN auth mechanism", err.Error())
}

func TestEmailNoUsernameCustomError(t *testing.T) {
	email := &Email{
		conf: &config.EmailConfig{}, tmpl: &template.Template{}, logger: promslog.NewNopLogger(),
	}
	a, err := email.auth("CRAM-MD5")
	require.ErrorIs(t, err, errNoAuthUserNameConfigured)
	require.Nil(t, a)
}

// TestEmailRejected simulates the failure of an otherwise valid message submission which fails at a later point than
// was previously expected by the code.
func TestEmailRejected(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	t.Cleanup(cancel)

	// Setup mock SMTP server which will reject at the DATA stage.
	srv, l, err := mockSMTPServer(t)
	require.NoError(t, err)
	t.Cleanup(func() {
		// We expect that the server has already been closed in the test.
		require.ErrorIs(t, srv.Shutdown(ctx), smtp.ErrServerClosed)
	})

	done := make(chan any, 1)
	go func() {
		// nolint:testifylint // require cannot be called outside the main goroutine: https://pkg.go.dev/testing#T.FailNow
		assert.NoError(t, srv.Serve(l))
		close(done)
	}()

	// Wait for mock SMTP server to become ready.
	require.Eventuallyf(t, func() bool {
		c, err := smtp.Dial(srv.Addr)
		if err != nil {
			t.Logf("dial failed to %q: %s", srv.Addr, err)
			return false
		}

		// Ping.
		if err = c.Noop(); err != nil {
			t.Logf("ping failed to %q: %s", srv.Addr, err)
			return false
		}

		// Ensure we close the connection to not prevent server from shutting down cleanly.
		if err = c.Close(); err != nil {
			t.Logf("close failed to %q: %s", srv.Addr, err)
			return false
		}

		return true
	}, time.Second*10, time.Millisecond*100, "mock SMTP server failed to start")

	// Use mock SMTP server and prepare alert to be sent.
	require.IsType(t, &net.TCPAddr{}, l.Addr())
	addr := l.Addr().(*net.TCPAddr)
	cfg := &config.EmailConfig{
		Smarthost: config.HostPort{Host: addr.IP.String(), Port: strconv.Itoa(addr.Port)},
		Hello:     "localhost",
		Headers:   make(map[string]string),
		From:      "alertmanager@system",
		To:        "sre@company",
	}
	tmpl, firingAlert, err := prepare(cfg)
	require.NoError(t, err)

	e := New(cfg, tmpl, promslog.NewNopLogger())

	// Send the alert to mock SMTP server.
	retry, err := e.Notify(context.Background(), firingAlert)
	require.ErrorContains(t, err, "501 5.5.4 Rejected!")
	require.True(t, retry)
	require.NoError(t, srv.Shutdown(ctx))

	require.Eventuallyf(t, func() bool {
		<-done
		return true
	}, time.Second*10, time.Millisecond*100, "mock SMTP server goroutine failed to close in time")
}

func mockSMTPServer(t *testing.T) (*smtp.Server, net.Listener, error) {
	t.Helper()

	// Listen on the next available high port.
	l, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		return nil, nil, errors.WrapInternalf(err, errors.CodeInternal, "connect")
	}

	addr, ok := l.Addr().(*net.TCPAddr)
	if !ok {
		return nil, nil, errors.NewInternalf(errors.CodeInternal, "unexpected address type: %T", l.Addr())
	}

	s := smtp.NewServer(&rejectingBackend{})
	s.Addr = addr.String()
	s.WriteTimeout = 10 * time.Second
	s.ReadTimeout = 10 * time.Second

	return s, l, nil
}

// rejectingBackend will reject submission at the DATA stage.
type rejectingBackend struct{}

func (b *rejectingBackend) NewSession(c *smtp.Conn) (smtp.Session, error) {
	return &mockSMTPSession{
		conn:    c,
		backend: b,
	}, nil
}

type mockSMTPSession struct {
	conn    *smtp.Conn
	backend smtp.Backend
}

func (s *mockSMTPSession) Mail(string, *smtp.MailOptions) error {
	return nil
}

func (s *mockSMTPSession) Rcpt(string, *smtp.RcptOptions) error {
	return nil
}

func (s *mockSMTPSession) Data(io.Reader) error {
	return &smtp.SMTPError{Code: 501, EnhancedCode: smtp.EnhancedCode{5, 5, 4}, Message: "Rejected!"}
}

func (*mockSMTPSession) Reset() {}

func (*mockSMTPSession) Logout() error { return nil }

func TestEmailNotifyWithThreading(t *testing.T) {
	cfgFile := os.Getenv(emailNoAuthConfigVar)
	if len(cfgFile) == 0 {
		t.Skipf("%s not set", emailNoAuthConfigVar)
	}

	c, err := loadEmailTestConfiguration(cfgFile)
	if err != nil {
		t.Fatal(err)
	}

	for _, tc := range []struct {
		name         string
		threadByDate string
		wantDatePart bool
	}{
		{
			name:         "threading with daily date (default)",
			threadByDate: "",
			wantDatePart: true,
		},
		{
			name:         "threading with explicit daily",
			threadByDate: "daily",
			wantDatePart: true,
		},
		{
			name:         "threading without date",
			threadByDate: "none",
			wantDatePart: false,
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			// Create context with group key (required for threading).
			ctx := notify.WithGroupKey(context.Background(), "test-group-key")

			emailCfg := &config.EmailConfig{
				Smarthost: c.Smarthost,
				To:        emailTo,
				From:      emailFrom,
				HTML:      "HTML body",
				Text:      "Text body",
				Threading: config.ThreadingConfig{
					Enabled:      true,
					ThreadByDate: tc.threadByDate,
				},
			}

			mail, _, err := notifyEmailWithContext(ctx, t, emailCfg, c.Server)
			require.NoError(t, err)

			referencesValue := mail.Headers["references"]
			inReplyToValue := mail.Headers["in-reply-to"]

			require.NotEmpty(t, referencesValue, "References header not found in %v", mail.Headers)
			require.NotEmpty(t, inReplyToValue, "In-Reply-To header not found in %v", mail.Headers)

			require.Equal(t, referencesValue, inReplyToValue, "References and In-Reply-To should match")

			// Verify the format: <alert-HASH-DATE@alertmanager>
			require.Contains(t, referencesValue, "<alert-")
			require.Contains(t, referencesValue, "@alertmanager>")

			if tc.wantDatePart {
				today := time.Now().Format("2006-01-02")
				require.Contains(t, referencesValue, today, "threading header should contain today's date")
			} else {
				// With thread_by_date: none, there should be no date
				// (empty string between hash and @).
				require.Contains(t, referencesValue, "-@alertmanager>", "threading header should have empty date part")
			}
		})
	}
}

func TestEmailGetPassword(t *testing.T) {
	passwordFile, err := os.CreateTemp("", "smtp-password")
	require.NoError(t, err, "creating temp file failed")
	_, err = passwordFile.WriteString("secret")
	require.NoError(t, err, "writing to temp file failed")

	for _, tc := range []struct {
		title     string
		updateCfg func(*config.EmailConfig)

		errMsg string
	}{
		{
			title: "password from field",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthPassword = "secret"
				cfg.AuthPasswordFile = ""
			},
		},
		{
			title: "password from file field",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthPassword = ""
				cfg.AuthPasswordFile = passwordFile.Name()
			},
		},
		{
			title: "password file path incorrect",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthPassword = ""
				cfg.AuthPasswordFile = "/does/not/exist"
			},
			errMsg: "could not read",
		},
	} {
		t.Run(tc.title, func(t *testing.T) {
			email := &Email{
				conf: &config.EmailConfig{},
			}

			tc.updateCfg(email.conf)

			password, err := email.getPassword()
			if len(tc.errMsg) > 0 {
				require.Error(t, err)
				if errors.Asc(err, errors.CodeInternal) {
					_, _, errMsg, _, _, _ := errors.Unwrapb(err)
					require.Contains(t, errMsg, tc.errMsg)
				} else {
					require.Contains(t, err.Error(), tc.errMsg)
				}
				require.Empty(t, password)
			} else {
				require.NoError(t, err)
				require.Equal(t, "secret", password)
			}
		})
	}
}

func TestEmailGetSecret(t *testing.T) {
	secretFile, err := os.CreateTemp("", "smtp-password")
	require.NoError(t, err, "creating temp file failed")
	_, err = secretFile.WriteString("secret")
	require.NoError(t, err, "writing to temp file failed")

	for _, tc := range []struct {
		title     string
		updateCfg func(*config.EmailConfig)

		errMsg string
	}{
		{
			title: "secret from field",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthSecret = "secret"
				cfg.AuthSecretFile = ""
			},
		},
		{
			title: "secret from file field",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthSecret = ""
				cfg.AuthSecretFile = secretFile.Name()
			},
		},
		{
			title: "secret file path incorrect",
			updateCfg: func(cfg *config.EmailConfig) {
				cfg.AuthSecret = ""
				cfg.AuthSecretFile = "/does/not/exist"
			},
			errMsg: "could not read",
		},
	} {
		t.Run(tc.title, func(t *testing.T) {
			email := &Email{
				conf: &config.EmailConfig{},
			}

			tc.updateCfg(email.conf)

			secret, err := email.getAuthSecret()
			if len(tc.errMsg) > 0 {
				require.Error(t, err)
				require.Contains(t, err.Error(), tc.errMsg)
				require.Empty(t, secret)
			} else {
				require.NoError(t, err)
				require.Equal(t, "secret", secret)
			}
		})
	}
}

func TestEmailImplicitTLS(t *testing.T) {
	tests := []struct {
		name             string
		port             string
		forceImplicitTLS *bool
		expectImplicit   bool
	}{
		{
			name:             "default behavior - port 465",
			port:             "465",
			forceImplicitTLS: nil,
			expectImplicit:   true,
		},
		{
			name:             "default behavior - port 587",
			port:             "587",
			forceImplicitTLS: nil,
			expectImplicit:   false,
		},
		{
			name:             "force implicit_tls=true on port 587",
			port:             "587",
			forceImplicitTLS: ptrTo(true),
			expectImplicit:   true,
		},
		{
			name:             "force implicit_tls=true on custom port",
			port:             "8465",
			forceImplicitTLS: ptrTo(true),
			expectImplicit:   true,
		},
		{
			name:             "implicit_tls=false disables implicit TLS on port 465",
			port:             "465",
			forceImplicitTLS: ptrTo(false),
			expectImplicit:   false,
		},
		{
			name:             "implicit_tls=false behaves like default on port 587",
			port:             "587",
			forceImplicitTLS: ptrTo(false),
			expectImplicit:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &config.EmailConfig{
				Smarthost:        config.HostPort{Host: "localhost", Port: tt.port},
				ForceImplicitTLS: tt.forceImplicitTLS,
			}

			// Simulate the judgment logic
			var useImplicitTLS bool
			if cfg.ForceImplicitTLS != nil {
				useImplicitTLS = *cfg.ForceImplicitTLS
			} else {
				useImplicitTLS = cfg.Smarthost.Port == "465"
			}

			require.Equal(t, tt.expectImplicit, useImplicitTLS,
				"Expected useImplicitTLS=%v for port=%s with forceImplicitTLS=%v",
				tt.expectImplicit, tt.port, tt.forceImplicitTLS)
		})
	}
}

func ptrTo(b bool) *bool {
	return &b
}
