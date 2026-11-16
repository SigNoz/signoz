package slo

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Version      string              `yaml:"version" json:"version"`
	Service      string              `yaml:"service" json:"service"`
	Environment  string              `yaml:"environment" json:"environment"`
	SLOs         []Definition        `yaml:"slos" json:"slos"`
	Completeness *CompletenessConfig `yaml:"completeness,omitempty" json:"completeness,omitempty"`
}

type CompletenessConfig struct {
	ExpectedMetrics  []string `yaml:"expected_metrics" json:"expected_metrics"`
	ServiceLabel     string   `yaml:"service_label" json:"service_label"`
	EnvironmentLabel string   `yaml:"environment_label" json:"environment_label"`
}

type Definition struct {
	Name                  string   `yaml:"name" json:"name"`
	Description           string   `yaml:"description" json:"description"`
	Type                  SLIType  `yaml:"type" json:"type"`
	Target                float64  `yaml:"target" json:"target"`
	Window                string   `yaml:"window" json:"window"`
	GoodQuery             string   `yaml:"good_query" json:"good_query,omitempty"`
	TotalQuery            string   `yaml:"total_query" json:"total_query,omitempty"`
	LatencyMetric         string   `yaml:"latency_metric" json:"latency_metric,omitempty"`
	ThresholdMS           float64  `yaml:"threshold_ms" json:"threshold_ms,omitempty"`
	RequiresCompleteness  bool     `yaml:"requires_completeness" json:"requires_completeness,omitempty"`
	CompletenessThreshold float64  `yaml:"completeness_threshold" json:"completeness_threshold,omitempty"`
	Dependencies          []string `yaml:"dependencies" json:"dependencies,omitempty"`
}

func LoadConfig(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, fmt.Errorf("read SLO config %q: %w", path, err)
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("parse SLO config %q: %w", path, err)
	}
	if err := cfg.Validate(); err != nil {
		return Config{}, fmt.Errorf("validate SLO config %q: %w", path, err)
	}
	return cfg, nil
}

func (c Config) Validate() error {
	if strings.TrimSpace(c.Service) == "" {
		return fmt.Errorf("service is required")
	}
	if strings.TrimSpace(c.Environment) == "" {
		return fmt.Errorf("environment is required")
	}
	if len(c.SLOs) == 0 {
		return fmt.Errorf("at least one SLO is required")
	}
	for i, definition := range c.SLOs {
		if err := definition.Validate(); err != nil {
			return fmt.Errorf("slos[%d]: %w", i, err)
		}
		if definition.Type != SLITypeLatencyThreshold {
			if err := c.validateQueryScope("good_query", definition.GoodQuery); err != nil {
				return fmt.Errorf("slos[%d]: %w", i, err)
			}
			if err := c.validateQueryScope("total_query", definition.TotalQuery); err != nil {
				return fmt.Errorf("slos[%d]: %w", i, err)
			}
		}
		if definition.RequiresCompleteness &&
			len(definition.Dependencies) == 0 &&
			(c.Completeness == nil || len(c.Completeness.ExpectedMetrics) == 0) {
			return fmt.Errorf(
				"slos[%d]: completeness requires dependencies or completeness.expected_metrics",
				i,
			)
		}
	}
	if c.Completeness != nil {
		if c.Completeness.ServiceLabel == "" {
			c.Completeness.ServiceLabel = "service_name"
		}
		if c.Completeness.EnvironmentLabel == "" {
			c.Completeness.EnvironmentLabel = "environment"
		}
	}
	return nil
}

func (d Definition) Validate() error {
	if strings.TrimSpace(d.Name) == "" {
		return fmt.Errorf("name is required")
	}
	target := d.NormalizedTarget()
	if target <= 0 || target > 1 {
		return fmt.Errorf("target must be in (0,1] or a percentage, got %v", d.Target)
	}
	if _, err := WindowDuration(d.Window); err != nil {
		return err
	}
	if d.CompletenessThreshold < 0 || d.CompletenessThreshold > 1 {
		return fmt.Errorf("completeness_threshold must be in [0,1], got %v", d.CompletenessThreshold)
	}
	switch d.Type {
	case SLITypeRatio, SLITypeCompleteness, SLITypeGroundedAnswers:
		if strings.TrimSpace(d.GoodQuery) == "" || strings.TrimSpace(d.TotalQuery) == "" {
			return fmt.Errorf("%s requires good_query and total_query", d.Type)
		}
		if err := validateWindowedCounterQuery("good_query", d.GoodQuery, d.Window); err != nil {
			return err
		}
		if err := validateWindowedCounterQuery("total_query", d.TotalQuery, d.Window); err != nil {
			return err
		}
	case SLITypeLatencyThreshold:
		if strings.TrimSpace(d.LatencyMetric) == "" || d.ThresholdMS <= 0 {
			return fmt.Errorf("latency_threshold requires latency_metric and positive threshold_ms")
		}
	default:
		return fmt.Errorf("unsupported SLI type %q", d.Type)
	}
	return nil
}

func WindowDuration(window string) (time.Duration, error) {
	window = strings.TrimSpace(window)
	if window == "" {
		return 0, fmt.Errorf("window is required")
	}
	if strings.HasSuffix(window, "d") {
		days, err := strconv.ParseFloat(strings.TrimSuffix(window, "d"), 64)
		if err != nil || days <= 0 {
			return 0, fmt.Errorf("invalid window %q", window)
		}
		return time.Duration(days * float64(24*time.Hour)), nil
	}
	duration, err := time.ParseDuration(window)
	if err != nil || duration <= 0 {
		return 0, fmt.Errorf("invalid window %q", window)
	}
	return duration, nil
}

func (d Definition) NormalizedTarget() float64 {
	if d.Target > 1 {
		return d.Target / 100
	}
	return d.Target
}

func (c Config) GateThreshold(definition Definition) float64 {
	if definition.CompletenessThreshold > 0 {
		return definition.CompletenessThreshold
	}
	return 0.95
}

func (c Config) MetricLabels() (string, string) {
	if c.Completeness == nil {
		return "service_name", "environment"
	}
	serviceLabel := strings.TrimSpace(c.Completeness.ServiceLabel)
	if serviceLabel == "" {
		serviceLabel = "service_name"
	}
	environmentLabel := strings.TrimSpace(c.Completeness.EnvironmentLabel)
	if environmentLabel == "" {
		environmentLabel = "environment"
	}
	return serviceLabel, environmentLabel
}

func validateWindowedCounterQuery(field, query, window string) error {
	compact := strings.ToLower(strings.Join(strings.Fields(query), ""))
	if !strings.Contains(compact, "increase(") && !strings.Contains(compact, "rate(") {
		return fmt.Errorf("%s must use rate() or increase() over the configured SLO window", field)
	}
	windowSelector := "[" + strings.ToLower(strings.TrimSpace(window)) + "]"
	if !strings.Contains(compact, windowSelector) {
		return fmt.Errorf("%s must use the configured SLO window %s", field, window)
	}
	return nil
}

func (c Config) validateQueryScope(field, query string) error {
	serviceLabel, environmentLabel := c.MetricLabels()
	compact := strings.Join(strings.Fields(query), "")
	requiredMatchers := []string{
		fmt.Sprintf(`%s="%s"`, serviceLabel, escape(c.Service)),
		fmt.Sprintf(`%s="%s"`, environmentLabel, escape(c.Environment)),
	}
	for _, matcher := range requiredMatchers {
		if !strings.Contains(compact, matcher) {
			return fmt.Errorf("%s must include exact scope matcher %s", field, matcher)
		}
	}
	return nil
}
