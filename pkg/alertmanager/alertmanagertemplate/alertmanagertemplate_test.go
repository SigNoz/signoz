package alertmanagertemplate

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/require"

	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

// testSetup returns template, context, and logger for tests.
func testSetup(t *testing.T) (*template.Template, context.Context, *slog.Logger) {
	t.Helper()
	tmpl := test.CreateTmpl(t)
	ctx := context.Background()
	ctx = notify.WithGroupKey(ctx, "test-group")
	ctx = notify.WithReceiverName(ctx, "slack")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "HighCPU", "severity": "critical"})
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return tmpl, ctx, logger
}

// firingAlert returns a firing alert with the given labels/annotations.
func firingAlert(labels, annotations map[string]string) *types.Alert {
	ls := model.LabelSet{}
	for k, v := range labels {
		ls[model.LabelName(k)] = model.LabelValue(v)
	}
	ann := model.LabelSet{}
	for k, v := range annotations {
		ann[model.LabelName(k)] = model.LabelValue(v)
	}
	now := time.Now()
	return &types.Alert{
		Alert: model.Alert{
			Labels:      ls,
			Annotations: ann,
			StartsAt:    now,
			EndsAt:      now.Add(time.Hour),
		},
	}
}

// TestExpandAlertTemplates_BothCustomTitleAndBody verifies that when both custom
// title and body templates are provided, both expand correctly (main happy path).
func TestExpandAlertTemplates_BothCustomTitleAndBody(t *testing.T) {
	tmpl, ctx, logger := testSetup(t)
	alerts := []*types.Alert{
		firingAlert(
			map[string]string{ruletypes.LabelAlertName: "HighCPU", ruletypes.LabelRuleId: "rule-1", ruletypes.LabelSeverityName: "critical"},
			nil,
		),
	}
	input := TemplateInput{
		TitleTemplate:        "[{{.Status}}] {{.AlertName}}",
		BodyTemplate:         "Alert {{.AlertName}} ({{.Status}})",
		DefaultTitleTemplate: "{{ .CommonLabels.alertname }}",
		DefaultBodyTemplate:  "{{ .Status }}",
	}
	got, err := ExpandAlertTemplates(ctx, tmpl, input, alerts, logger)
	require.NoError(t, err)
	require.Equal(t, "[firing] HighCPU", got.Title)
	require.Equal(t, "Alert HighCPU (firing)", got.Body)
}

// TestExpandAlertTemplates_CustomTitleExpands verifies that a custom title
// template expands against NotificationTemplateData (rule-level fields).
func TestExpandAlertTemplates_CustomTitleExpands(t *testing.T) {
	tmpl, ctx, logger := testSetup(t)
	alerts := []*types.Alert{
		firingAlert(map[string]string{ruletypes.LabelAlertName: "HighCPU", ruletypes.LabelRuleId: "r1"}, nil),
		firingAlert(map[string]string{ruletypes.LabelAlertName: "HighCPU", ruletypes.LabelRuleId: "r1"}, nil),
	}
	input := TemplateInput{
		TitleTemplate:        "{{.AlertName}}: {{.TotalFiring}} firing",
		DefaultTitleTemplate: "fallback",
	}
	got, err := ExpandAlertTemplates(ctx, tmpl, input, alerts, logger)
	require.NoError(t, err)
	require.Equal(t, "HighCPU: 2 firing", got.Title)
	require.Equal(t, "", got.Body)
}

// TestExpandAlertTemplates_CustomBodySingleAlert verifies that a custom body
// template is expanded once per alert; with one alert, body is that expansion.
func TestExpandAlertTemplates_CustomBodySingleAlert(t *testing.T) {
	tmpl, ctx, logger := testSetup(t)
	alerts := []*types.Alert{
		firingAlert(
			map[string]string{ruletypes.LabelAlertName: "HighCPU", ruletypes.LabelSeverityName: "critical"},
			map[string]string{"description": "CPU > 80%"},
		),
	}
	input := TemplateInput{
		BodyTemplate: "{{.AlertName}} ({{.Severity}}): {{.Annotations.description}}",
	}
	got, err := ExpandAlertTemplates(ctx, tmpl, input, alerts, logger)
	require.NoError(t, err)
	require.Equal(t, "", got.Title)
	require.Equal(t, "HighCPU (critical): CPU > 80%", got.Body)
}

// TestExpandAlertTemplates_CustomBodyMultipleAlerts verifies that body template
// is expanded per alert and results are concatenated with "<br><br>".
func TestExpandAlertTemplates_CustomBodyMultipleAlerts(t *testing.T) {
	tmpl, ctx, logger := testSetup(t)
	alerts := []*types.Alert{
		firingAlert(map[string]string{ruletypes.LabelAlertName: "A"}, nil),
		firingAlert(map[string]string{ruletypes.LabelAlertName: "B"}, nil),
		firingAlert(map[string]string{ruletypes.LabelAlertName: "C"}, nil),
	}
	input := TemplateInput{
		BodyTemplate: "{{.AlertName}}",
	}
	got, err := ExpandAlertTemplates(ctx, tmpl, input, alerts, logger)
	require.NoError(t, err)
	require.Equal(t, "A<br><br>B<br><br>C", got.Body)
}

// TestExpandAlertTemplates_BothDefaultTitleAndBody verifies that when no custom
// templates are set, both title and body fall back to default templates
// (executed against Prometheus template.Data).
func TestExpandAlertTemplates_BothDefaultTitleAndBody(t *testing.T) {
	tmpl, ctx, logger := testSetup(t)
	alerts := []*types.Alert{
		firingAlert(map[string]string{ruletypes.LabelAlertName: "HighCPU", ruletypes.LabelSeverityName: "critical"}, nil),
	}
	input := TemplateInput{
		TitleTemplate:        "",
		BodyTemplate:         "",
		DefaultTitleTemplate: "{{ .CommonLabels.alertname }}",
		DefaultBodyTemplate:  "{{ .Status }}: {{ .CommonLabels.alertname }}",
	}
	got, err := ExpandAlertTemplates(ctx, tmpl, input, alerts, logger)
	require.NoError(t, err)
	require.Equal(t, "HighCPU", got.Title)
	require.Equal(t, "firing: HighCPU", got.Body)
}
