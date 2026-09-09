package profile

import "testing"

func TestValidateBackendProfile(t *testing.T) {
	p := Profile{
		Metadata: Metadata{Name: "checkout", Service: "checkout"},
		Spec: Spec{
			DataKind: "backend",
			Source:   SourceSpec{Adapter: "signoz"},
			AuditRules: []RuleSpec{{
				ID: "service", Type: "required_field", Signal: "traces",
				Field: "service.name", Severity: "blocker",
			}},
		},
	}
	if err := p.Validate(); err != nil {
		t.Fatalf("validate profile: %v", err)
	}
}

func TestValidateRejectsUnknownDataKind(t *testing.T) {
	p := Profile{Metadata: Metadata{Name: "x", Service: "x"}, Spec: Spec{
		DataKind: "unknown", Source: SourceSpec{Adapter: "signoz"},
	}}
	if err := p.Validate(); err == nil {
		t.Fatal("expected invalid data kind")
	}
}
