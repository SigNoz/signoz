package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"text/tabwriter"
	"time"

	"github.com/guruvedhanth-s/reliability-agent/internal/api"
	"github.com/guruvedhanth-s/reliability-agent/internal/profile"
	"github.com/guruvedhanth-s/reliability-agent/internal/registry"
	"github.com/guruvedhanth-s/reliability-agent/internal/slo"
	"github.com/guruvedhanth-s/reliability-agent/internal/source/signoz"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "slo" {
		if err := runSLO(os.Args[2:]); err != nil {
			fmt.Fprintln(os.Stderr, "error:", err)
			os.Exit(1)
		}
		return
	}
	runServer(os.Args[1:])
}

func runServer(args []string) {
	fs := flag.NewFlagSet("server", flag.ExitOnError)
	listen := fs.String("listen", ":8081", "HTTP listen address")
	profileFile := fs.String("profile", "", "optional profile YAML to load at startup")
	_ = fs.Parse(args)

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

	slog.Info("reliability-agent listening", "address", *listen, "signoz_url", signozURL)
	if err := http.ListenAndServe(*listen, api.NewWithSLO(profiles, sloEngine)); err != nil {
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
