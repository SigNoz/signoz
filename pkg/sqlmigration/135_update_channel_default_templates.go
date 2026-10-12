package sqlmigration

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

// The seeded default templates this migration replaces, byte-exact as the
// frontend (slack / msteams) and the backend consts (incidentio / jsmops)
// shipped them over time. A channel whose template matches none of these was
// customized and is never touched.
const (
	slackDefaultTextPre2024 = `{{ range .Alerts -}}
     *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}

     *Summary:* {{ .Annotations.summary }}
     *Description:* {{ .Annotations.description }}

     *Details:*
       {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}
       {{ end }}
     {{ end }}`

	slackDefaultText2024 = `{{ range .Alerts -}}
     *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}

     *Summary:* {{ .Annotations.summary }}
     *Description:* {{ .Annotations.description }}
     *RelatedLogs:* {{ .Annotations.related_logs }}
     *RelatedTraces:* {{ .Annotations.related_traces }}

     *Details:*
       {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}
       {{ end }}
     {{ end }}`

	slackDefaultText2026 = `{{ range .Alerts -}}
     *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}

     *Summary:* {{ .Annotations.summary }}
     *Description:* {{ .Annotations.description }}
     *RelatedLogs:* {{ if gt (len .Annotations.related_logs) 0 -}} View in <{{ .Annotations.related_logs }}|logs explorer> {{- end}}
     *RelatedTraces:* {{ if gt (len .Annotations.related_traces) 0 -}} View in <{{ .Annotations.related_traces }}|traces explorer> {{- end}}

     *Details:*
       {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}
       {{ end }}
     {{ end }}`

	slackDefaultTextCurrent = `{{ range .Alerts -}}
     *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}

     *Summary:* {{ .Annotations.summary }}
     *Description:* {{ .Annotations.description }}
     {{ template "signoz.relatedLinks.slack" . }}

     *Details:*
       {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}
       {{ end }}
     {{ end }}`

	markdownDefaultDescription2026 = `{{ range .Alerts -}}
**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }}

{{ if .Annotations.summary }}**Summary:** {{ .Annotations.summary }}

{{ end }}{{ if .Annotations.description }}**Description:** {{ .Annotations.description }}

{{ end }}{{ if .GeneratorURL }}[View in SigNoz]({{ .GeneratorURL }})

{{ end }}{{ if .Annotations.related_logs }}[View related logs]({{ .Annotations.related_logs }})

{{ end }}{{ if .Annotations.related_traces }}[View related traces]({{ .Annotations.related_traces }})

{{ end }}{{ end }}`

	markdownDefaultDescriptionCurrent = `{{ range .Alerts -}}
**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }}

{{ if .Annotations.summary }}**Summary:** {{ .Annotations.summary }}

{{ end }}{{ if .Annotations.description }}**Description:** {{ .Annotations.description }}

{{ end }}{{ if .GeneratorURL }}[View in SigNoz]({{ .GeneratorURL }})

{{ end }}{{ template "signoz.relatedLinks.markdown" . }}{{ end }}`
)

var channelDefaultTextUpgrades = map[string]string{
	slackDefaultTextPre2024: slackDefaultTextCurrent,
	slackDefaultText2024:    slackDefaultTextCurrent,
	slackDefaultText2026:    slackDefaultTextCurrent,
}

var channelDefaultDescriptionUpgrades = map[string]string{
	markdownDefaultDescription2026: markdownDefaultDescriptionCurrent,
}

// receiver configs lists and the template field each one carries.
var channelTemplateFields = map[string]string{
	"slack_configs":      "text",
	"msteams_configs":    "text",
	"msteamsv2_configs":  "text",
	"incidentio_configs": "description",
	"jsmops_configs":     "description",
}

type updateChannelDefaultTemplates struct {
	logger *slog.Logger
}

func NewUpdateChannelDefaultTemplatesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_channel_templates"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &updateChannelDefaultTemplates{logger: ps.Logger}, nil
	})
}

func (migration *updateChannelDefaultTemplates) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

type channelTemplateRow struct {
	bun.BaseModel `bun:"table:notification_channel"`

	ID   string `bun:"id,pk"`
	Type string `bun:"type"`
	Data string `bun:"data"`
	Spec string `bun:"spec,nullzero"`
}

// Up rewrites, in both the receiver (data) and the v2 spec, channel templates
// that are byte-equal to a seeded default of an earlier release, so untouched
// channels keep tracking the current default. A malformed row is logged and
// skipped, never fails the migration.
func (migration *updateChannelDefaultTemplates) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	rows := make([]*channelTemplateRow, 0)
	err = tx.NewSelect().
		Model(&rows).
		Where("type IN (?)", bun.In([]string{"slack", "msteams", "msteamsv2", "incidentio", "jsmops"})).
		Scan(ctx)
	if err != nil {
		return err
	}

	for _, row := range rows {
		data, dataChanged, err := upgradeReceiverDefaultTemplates(row.Data)
		if err != nil {
			migration.logger.WarnContext(ctx, "skipping channel with unreadable receiver", "channel_id", row.ID, "error", err)
			continue
		}

		spec, specChanged, err := upgradeSpecDefaultTemplate(row.Type, row.Spec)
		if err != nil {
			migration.logger.WarnContext(ctx, "skipping channel with unreadable spec", "channel_id", row.ID, "error", err)
			continue
		}

		if !dataChanged && !specChanged {
			continue
		}

		row.Data, row.Spec = data, spec
		if _, err := tx.NewUpdate().Model(row).Column("data", "spec").WherePK().Exec(ctx); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *updateChannelDefaultTemplates) Down(context.Context, *bun.DB) error {
	return nil
}

func upgradeReceiverDefaultTemplates(data string) (string, bool, error) {
	receiver := map[string]any{}
	if err := json.Unmarshal([]byte(data), &receiver); err != nil {
		return "", false, err
	}

	changed := false
	for configsKey, field := range channelTemplateFields {
		configs, ok := receiver[configsKey].([]any)
		if !ok {
			continue
		}
		for _, c := range configs {
			config, ok := c.(map[string]any)
			if !ok {
				continue
			}
			value, ok := config[field].(string)
			if !ok {
				continue
			}
			if upgraded, ok := upgradeChannelTemplate(field, value); ok {
				config[field] = upgraded
				changed = true
			}
		}
	}
	if !changed {
		return data, false, nil
	}

	out, err := marshalJSONNoHTMLEscape(receiver)
	return out, true, err
}

func upgradeSpecDefaultTemplate(rowType, spec string) (string, bool, error) {
	if spec == "" {
		return spec, false, nil
	}

	field := "text"
	if rowType == "incidentio" || rowType == "jsmops" {
		field = "description"
	}

	parsed := map[string]any{}
	if err := json.Unmarshal([]byte(spec), &parsed); err != nil {
		return "", false, err
	}
	value, ok := parsed[field].(string)
	if !ok {
		return spec, false, nil
	}
	upgraded, ok := upgradeChannelTemplate(field, value)
	if !ok {
		return spec, false, nil
	}

	parsed[field] = upgraded
	out, err := marshalJSONNoHTMLEscape(parsed)
	return out, true, err
}

func upgradeChannelTemplate(field, value string) (string, bool) {
	upgrades := channelDefaultTextUpgrades
	if field == "description" {
		upgrades = channelDefaultDescriptionUpgrades
	}
	upgraded, ok := upgrades[value]
	return upgraded, ok
}

// marshalJSONNoHTMLEscape keeps < and > literal: slack templates contain
// <url|label> links and the stored JSON stays readable.
func marshalJSONNoHTMLEscape(v any) (string, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return "", err
	}
	return strings.TrimSuffix(buf.String(), "\n"), nil
}
