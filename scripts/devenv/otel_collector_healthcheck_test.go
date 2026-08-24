package devenv

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
)

// signoz/signoz-otel-collector does not ship wget, curl, or nc. bash is present;
// /bin/sh is dash and has no /dev/tcp.
func TestOtelCollectorHealthcheckUsesImageLocalProbe(t *testing.T) {
	argv := healthcheckArgv(t)
	require.GreaterOrEqual(t, len(argv), 2)
	require.Equal(t, "CMD", argv[0], "CMD-SHELL runs /bin/sh (dash), which has no /dev/tcp")
	require.Equal(t, "bash", argv[1], "probe must use a binary present in the collector image")

	joined := strings.Join(argv, " ")
	for _, missing := range []string{"wget", "curl"} {
		require.NotContains(t, joined, missing, "collector image does not contain %s", missing)
	}
	require.Contains(t, joined, "/dev/tcp")
	require.Contains(t, joined, "13133")
}

func TestOtelCollectorHealthcheckProbe(t *testing.T) {
	if _, err := exec.LookPath("bash"); err != nil {
		t.Skip("bash is required to exercise /dev/tcp")
	}

	argv := healthcheckArgv(t)
	require.GreaterOrEqual(t, len(argv), 4)
	require.Equal(t, []string{"CMD", "bash", "-c"}, argv[:3])
	script := argv[3]
	require.Contains(t, script, "/dev/tcp/localhost/13133")

	t.Run("http_200", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))
		t.Cleanup(srv.Close)

		u, err := url.Parse(srv.URL)
		require.NoError(t, err)

		out, err := runHealthcheckScript(t, script, u.Hostname(), u.Port())
		require.NoError(t, err, out)
	})

	t.Run("closed_port", func(t *testing.T) {
		ln, err := net.Listen("tcp", "127.0.0.1:0")
		require.NoError(t, err)
		port := strconv.Itoa(ln.Addr().(*net.TCPAddr).Port)
		require.NoError(t, ln.Close())

		out, err := runHealthcheckScript(t, script, "127.0.0.1", port)
		require.Error(t, err, out)
	})
}

func healthcheckArgv(t *testing.T) []string {
	t.Helper()

	raw, err := os.ReadFile(otelCollectorComposePath(t))
	require.NoError(t, err)

	var compose struct {
		Services map[string]struct {
			Healthcheck *struct {
				Test any `yaml:"test"`
			} `yaml:"healthcheck"`
		} `yaml:"services"`
	}
	require.NoError(t, yaml.Unmarshal(raw, &compose))

	svc, ok := compose.Services["signoz-otel-collector"]
	require.True(t, ok, "signoz-otel-collector service missing")
	require.NotNil(t, svc.Healthcheck, "healthcheck missing")

	switch test := svc.Healthcheck.Test.(type) {
	case []any:
		argv := make([]string, 0, len(test))
		for _, part := range test {
			s, ok := part.(string)
			require.True(t, ok, "healthcheck test entry must be a string, got %T", part)
			argv = append(argv, s)
		}
		return argv
	case string:
		return strings.Fields(test)
	default:
		t.Fatalf("unexpected healthcheck test type %T", test)
		return nil
	}
}

func otelCollectorComposePath(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	root := filepath.Join(filepath.Dir(file), "..", "..")
	return filepath.Join(root, ".devenv", "docker", "signoz-otel-collector", "compose.yaml")
}

func runHealthcheckScript(t *testing.T, script, host, port string) (string, error) {
	t.Helper()
	rewritten := strings.NewReplacer("localhost", host, "13133", port).Replace(script)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "bash", "-c", rewritten)
	out, err := cmd.CombinedOutput()
	return string(out), err
}
