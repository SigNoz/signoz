package profile

import (
	"fmt"
	"os"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

var validDataKinds = map[string]bool{
	"backend":  true,
	"ai_agent": true,
	"worker":   true,
	"custom":   true,
}

var validRuleTypes = map[string]bool{
	"required_field": true,
	"required_span":  true,
	"freshness":      true,
	"cardinality":    true,
}

var validSignals = map[string]bool{
	"traces":  true,
	"metrics": true,
	"logs":    true,
}

var validSeverities = map[string]bool{
	"blocker": true,
	"warning": true,
	"info":    true,
}

func LoadFile(path string) (Profile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Profile{}, fmt.Errorf("read profile %q: %w", path, err)
	}
	var p Profile
	if err := yaml.Unmarshal(data, &p); err != nil {
		return Profile{}, fmt.Errorf("parse profile %q: %w", path, err)
	}
	if err := p.Validate(); err != nil {
		return Profile{}, fmt.Errorf("validate profile %q: %w", path, err)
	}
	return p, nil
}

func (p Profile) Validate() error {
	if strings.TrimSpace(p.Metadata.Name) == "" {
		return fmt.Errorf("metadata.name is required")
	}
	if strings.TrimSpace(p.Metadata.Service) == "" {
		return fmt.Errorf("metadata.service is required")
	}
	if !validDataKinds[p.Spec.DataKind] {
		return fmt.Errorf("spec.data_kind must be one of backend, ai_agent, worker, custom")
	}
	if strings.TrimSpace(p.Spec.Source.Adapter) == "" {
		return fmt.Errorf("spec.source.adapter is required")
	}
	for i, rule := range p.Spec.AuditRules {
		if err := rule.validate(); err != nil {
			return fmt.Errorf("audit_rules[%d]: %w", i, err)
		}
	}
	return nil
}

func (r RuleSpec) validate() error {
	if strings.TrimSpace(r.ID) == "" {
		return fmt.Errorf("id is required")
	}
	if !validRuleTypes[r.Type] {
		return fmt.Errorf("unsupported type %q", r.Type)
	}
	if !validSeverities[r.Severity] {
		return fmt.Errorf("severity must be blocker, warning, or info")
	}
	if r.Signal != "" && !validSignals[r.Signal] {
		return fmt.Errorf("signal must be traces, metrics, or logs")
	}
	switch r.Type {
	case "required_field":
		if strings.TrimSpace(r.Field) == "" {
			return fmt.Errorf("field is required")
		}
	case "required_span":
		if strings.TrimSpace(r.SpanName) == "" {
			return fmt.Errorf("span_name is required")
		}
	case "freshness":
		if strings.TrimSpace(r.MaxAge) == "" {
			return fmt.Errorf("max_age is required")
		}
		if _, err := time.ParseDuration(r.MaxAge); err != nil {
			return fmt.Errorf("invalid max_age: %w", err)
		}
	case "cardinality":
		if strings.TrimSpace(r.Field) == "" || r.MaxDistinctValues <= 0 {
			return fmt.Errorf("field and positive max_distinct_values are required")
		}
	}
	return nil
}
