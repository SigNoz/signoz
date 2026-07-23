package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"text/tabwriter"
	"time"

	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/alerting"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/api"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/audit"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/monitor"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/profile"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/registry"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/slo"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/source/signoz"
)

func main() {
	if len(os.Args) > 1 {
		var err error
		switch os.Args[1] {
		case "slo":
			err = runSLO(os.Args[2:])
		case "audit-watch":
			err = runAuditWatch(os.Args[2:])
		default:
			runServer(os.Args[1:])
			return
		}
		if err != nil {
			fmt.Fprintln(os.Stderr, "error:", err)
			os.Exit(1)
		}
		return
	}
	runServer(os.Args[1:])
}

func runAuditWatch(args []string) error {
	fs := flag.NewFlagSet("audit-watch", flag.ContinueOnError)
	profilePath := fs.String("profile", "examples/log-demo-backend.yaml", "telemetry profile YAML path")
	signozURL := fs.String("signoz-url", os.Getenv("SIGNOZ_URL"), "SigNoz base URL")
	apiKey := fs.String("api-key", os.Getenv("SIGNOZ_API_KEY"), "SigNoz service-account API key")
	interval := fs.Duration("interval", 2*time.Second, "audit interval")
	lookback := fs.Duration("lookback", 15*time.Second, "SigNoz query lookback")
	limit := fs.Int("limit", 200, "maximum logs per audit")
	alertSeverity := fs.String("alert-severity", "blocker", "minimum failed finding severity that opens an alert")
	failuresBeforeAlert := fs.Int("failures-before-alert", 2, "consecutive alertable failures required")
	webhookURL := fs.String("webhook-url", "", "optional alert webhook URL")
	if err := fs.Parse(args); err != nil {
		if err == flag.ErrHelp {
			return nil
		}
		return err
	}

	p, err := profile.LoadFile(*profilePath)
	if err != nil {
		return err
	}
	if p.Spec.Source.Adapter != "signoz" {
		return fmt.Errorf("audit-watch currently supports the signoz source adapter")
	}
	if *signozURL == "" {
		*signozURL = p.Spec.Source.Endpoint
	}
	if *apiKey == "" {
		return fmt.Errorf("SigNoz API key is required; set SIGNOZ_API_KEY or use --api-key")
	}
	client := signoz.NewClient(*signozURL, *apiKey)
	sinks := alerting.MultiSink{&alerting.JSONSink{Writer: os.Stdout}}
	if *webhookURL != "" {
		sinks = append(sinks, alerting.WebhookSink{URL: *webhookURL})
	}

	runner := &monitor.Runner{
		Profile:             p,
		Source:              signoz.NewLogSource(client, *limit),
		Audit:               audit.Engine{},
		Sink:                sinks,
		Interval:            *interval,
		Lookback:            *lookback,
		AlertSeverity:       *alertSeverity,
		FailuresBeforeAlert: *failuresBeforeAlert,
		OnReport: func(report audit.Report) {
			slog.Info("track-a audit",
				"service", report.Service,
				"status", report.OverallStatus,
				"score", report.Score,
				"coverage", report.Coverage,
				"blockers", report.Counts["blocker"],
				"warnings", report.Counts["warning"])
		},
		OnError: func(err error) { slog.Error("track-a audit cycle", "error", err) },
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	slog.Info("track-a log monitor started",
		"service", p.Metadata.Service,
		"environment", p.Metadata.Environment,
		"interval", *interval,
		"lookback", *lookback,
		"alert_severity", *alertSeverity,
		"failures_before_alert", *failuresBeforeAlert,
		"signoz_url", *signozURL)
	return runner.Run(ctx)
}

func runServer(args []string) {
	fs := flag.NewFlagSet("server", flag.ExitOnError)
	listen := fs.String("listen", "127.0.0.1:8081", "HTTP listen address")
	profileFile := fs.String("profile", "", "optional profile YAML to load at startup")
	authToken := fs.String(
		"auth-token",
		os.Getenv("RELIABILITY_AGENT_API_KEY"),
		"bearer token for API access; defaults to RELIABILITY_AGENT_API_KEY",
	)
	_ = fs.Parse(args)
	if *authToken == "" && !isLoopbackListen(*listen) {
		slog.Error("refusing unauthenticated non-loopback listener", "address", *listen)
		os.Exit(1)
	}

	profiles := registry.New()
	if *profileFile != "" {
		p, err := profile.LoadFile(*profileFile)
		if err != nil {
			slog.Error("load profile", "error", err)
			os.Exit(1)
		}
		if err := profiles.Put(p); err != nil {
			slog.Error("register profile", "error", err)
			os.Exit(1)
		}
	}

	signozURL := os.Getenv("SIGNOZ_URL")
	if signozURL == "" {
		signozURL = "http://localhost:8080"
	}
	signozClient := signoz.NewClient(signozURL, os.Getenv("SIGNOZ_API_KEY"))
	sloGate := slo.NewMetricPresenceGate(signozClient, nil)
	sloEngine := slo.NewEngine(signozClient, sloGate)

	server := &http.Server{
		Addr:              *listen,
		Handler:           api.NewWithOptions(profiles, sloEngine, api.Options{APIKey: *authToken}),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	slog.Info(
		"reliability-agent listening",
		"address", *listen,
		"signoz_url", signozURL,
		"authentication_enabled", *authToken != "",
	)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func runSLO(args []string) error {
	fs := flag.NewFlagSet("slo", flag.ContinueOnError)
	configPath := fs.String("config", "examples/checkout-slo.yaml", "SLO YAML path")
	signozURL := fs.String("signoz-url", envOr("SIGNOZ_URL", "http://localhost:8080"), "SigNoz base URL")
	apiKey := fs.String("api-key", os.Getenv("SIGNOZ_API_KEY"), "SigNoz service-account API key")
	output := fs.String("output", "text", "output format: text or json")
	if err := fs.Parse(args); err != nil {
		if err == flag.ErrHelp {
			return nil
		}
		return err
	}

	cfg, err := slo.LoadConfig(*configPath)
	if err != nil {
		return err
	}
	client := signoz.NewClient(*signozURL, *apiKey)
	gate := slo.NewMetricPresenceGate(client, nil)
	engine := slo.NewEngine(client, gate)
	reports, err := engine.Evaluate(context.Background(), cfg, time.Now())
	if err != nil {
		return err
	}
	if *output == "json" {
		return json.NewEncoder(os.Stdout).Encode(map[string]any{
			"service":     cfg.Service,
			"environment": cfg.Environment,
			"reports":     reports,
		})
	}
	if *output != "text" {
		return fmt.Errorf("unsupported output format %q", *output)
	}
	printSLOReports(cfg, reports)
	return nil
}

func printSLOReports(cfg slo.Config, reports []slo.Report) {
	writer := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintf(writer, "SLO\tSTATE\tSLI\tTARGET\tBUDGET LEFT\tBURN\n")
	for _, report := range reports {
		sli, budget, burn := "-", "-", "-"
		if report.State != slo.StateIndeterminate {
			sli = fmt.Sprintf("%.2f%%", report.SLI*100)
			budget = fmt.Sprintf("%.2f%%", report.ErrorBudgetRemaining*100)
			burn = fmt.Sprintf("%.2fx", report.BurnRate)
		}
		fmt.Fprintf(writer, "%s\t%s\t%s\t%.2f%%\t%s\t%s\n",
			report.Name, report.State, sli, report.Target*100, budget, burn)
	}
	_ = writer.Flush()
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func isLoopbackListen(address string) bool {
	host, _, err := net.SplitHostPort(address)
	if err != nil {
		return false
	}
	if host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
