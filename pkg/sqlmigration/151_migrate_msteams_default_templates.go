package sqlmigration

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log/slog"
	"regexp"
	"slices"
	"strings"
	"text/template/parse"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

const (
	msteamsConfigsKey = "msteamsv2_configs"
	msteamsTitleField = "title"
	msteamsTextField  = "text"

	msteamsDefaultTitle = `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}`

	msteamsDefaultText = `{{ range .Alerts -}}
**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }} - {{ .Status }}

{{ if .Annotations.summary }}**Summary:** {{ .Annotations.summary }}

{{ end }}{{ if .Annotations.description }}**Description:** {{ .Annotations.description }}

{{ end }}{{ template "signoz.relatedLinks.markdown" . }}{{ with (.Labels.Remove (stringSlice "alertname" "severity" "ruleId" "ruleSource")).SortedPairs }}**Details:**

{{ range . }}- **{{ .Name }}:** {{ .Value }}
{{ end }}
{{ end }}{{ end }}`

	msteamsSlackSeedTitle = `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}
     {{- if gt (len .CommonLabels) (len .GroupLabels) -}}
       {{" "}}(
       {{- with .CommonLabels.Remove .GroupLabels.Names }}
         {{- range $index, $label := .SortedPairs -}}
           {{ if $index }}, {{ end }}
           {{- $label.Name }}="{{ $label.Value -}}"
         {{- end }}
       {{- end -}}
       )
     {{- end }}`

	msteamsSlackRelatedLinksCall    = `{{ template "signoz.relatedLinks.slack" . }}`
	msteamsMarkdownRelatedLinksCall = `{{ template "signoz.relatedLinks.markdown" . }}`

	msteamsMaskOpen  = ""
	msteamsMaskClose = ""

	// A description counts as derived from the Slack seed once it still bolds this many of the seed's labels the Slack way.
	msteamsSlackSeedLabelThreshold = 2
)

const (
	msteamsTemplateUnchanged msteamsTemplateOutcome = iota
	msteamsTemplateReplaced
	msteamsTemplateConverted
	msteamsTemplateCustom
)

var (
	// Every description the channel form prefilled for Microsoft Teams; they differ only in the related links lines.
	msteamsSlackSeedTexts = []string{
		`{{ range .Alerts -}}
     *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}

     *Summary:* {{ .Annotations.summary }}
     *Description:* {{ .Annotations.description }}

     *Details:*
       {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}
       {{ end }}
     {{ end }}`,
		`{{ range .Alerts -}}
     *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}

     *Summary:* {{ .Annotations.summary }}
     *Description:* {{ .Annotations.description }}
     *RelatedLogs:* {{ .Annotations.related_logs }}
     *RelatedTraces:* {{ .Annotations.related_traces }}

     *Details:*
       {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}
       {{ end }}
     {{ end }}`,
		`{{ range .Alerts -}}
     *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}

     *Summary:* {{ .Annotations.summary }}
     *Description:* {{ .Annotations.description }}
     *RelatedLogs:* {{ if gt (len .Annotations.related_logs) 0 -}} View in <{{ .Annotations.related_logs }}|logs explorer> {{- end}}
     *RelatedTraces:* {{ if gt (len .Annotations.related_traces) 0 -}} View in <{{ .Annotations.related_traces }}|traces explorer> {{- end}}

     *Details:*
       {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}
       {{ end }}
     {{ end }}`,
		`{{ range .Alerts -}}
     *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}

     *Summary:* {{ .Annotations.summary }}
     *Description:* {{ .Annotations.description }}
     {{ template "signoz.relatedLinks.slack" . }}

     *Details:*
       {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}
       {{ end }}
     {{ end }}`,
	}

	msteamsSlackSeedLabels = []string{"Alert:", "Summary:", "Description:", "Details:"}

	msteamsControlKeywords = []string{"if", "else", "end", "range", "with", "define", "block", "break", "continue"}

	msteamsActionPattern      = regexp.MustCompile(`(?s)\{\{.*?\}\}`)
	msteamsMaskPattern        = regexp.MustCompile(msteamsMaskOpen + `(\d+)` + msteamsMaskClose)
	msteamsSlackBoldPattern   = regexp.MustCompile(`\*([^\s*][^*\n]*)\*`)
	msteamsSlackLinkPattern   = regexp.MustCompile(`<([^<>|\s]+)\|([^<>\n]+)>`)
	msteamsSlackBulletPattern = regexp.MustCompile(`[ \t]*•[ \t]*`)
	msteamsIndentPattern      = regexp.MustCompile(`(?m)^[ \t]+`)
)

type msteamsTemplateOutcome int

type migrateMSTeamsDefaultTemplates struct {
	logger *slog.Logger
}

type msteamsConfigRow struct {
	bun.BaseModel `bun:"table:alertmanager_config"`

	ID     string `bun:"id"`
	OrgID  string `bun:"org_id"`
	Config string `bun:"config"`
}

type msteamsChannelRow struct {
	bun.BaseModel `bun:"table:notification_channel"`

	ID    string `bun:"id"`
	OrgID string `bun:"org_id"`
	Data  string `bun:"data"`
	Spec  string `bun:"spec,nullzero"`
}

type msteamsMigrationCounts struct {
	replaced  int
	converted int
	custom    int
	failed    int
}

func NewMigrateMSTeamsDefaultTemplatesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_msteams_default_templates"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateMSTeamsDefaultTemplates{logger: ps.Logger}, nil
		},
	)
}

func (migration *migrateMSTeamsDefaultTemplates) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *migrateMSTeamsDefaultTemplates) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if err := migration.migrateConfigs(ctx, tx); err != nil {
		return err
	}

	if err := migration.migrateChannels(ctx, tx); err != nil {
		return err
	}

	return tx.Commit()
}

func (migration *migrateMSTeamsDefaultTemplates) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *migrateMSTeamsDefaultTemplates) migrateConfigs(ctx context.Context, tx bun.Tx) error {
	rows := make([]*msteamsConfigRow, 0)
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	counts := msteamsMigrationCounts{}
	for _, row := range rows {
		cfg := make(map[string]json.RawMessage)
		if err := json.Unmarshal([]byte(row.Config), &cfg); err != nil {
			migration.logger.WarnContext(ctx, "skipping alertmanager config with unreadable config", slog.String("config_id", row.ID), errors.Attr(err))
			counts.failed++
			continue
		}

		receiversRaw, ok := cfg["receivers"]
		if !ok || string(receiversRaw) == "null" {
			continue
		}

		receivers := make([]map[string]json.RawMessage, 0)
		if err := json.Unmarshal(receiversRaw, &receivers); err != nil {
			migration.logger.WarnContext(ctx, "skipping alertmanager config with unreadable receivers", slog.String("config_id", row.ID), errors.Attr(err))
			counts.failed++
			continue
		}

		changed := false
		for _, receiver := range receivers {
			var receiverName string
			_ = json.Unmarshal(receiver["name"], &receiverName)

			outcomes, err := migrateMSTeamsReceiver(receiver)
			if err != nil {
				migration.logger.WarnContext(ctx, "leaving msteams receiver templates as is", slog.String("config_id", row.ID), slog.String("org_id", row.OrgID), slog.String("receiver", receiverName), errors.Attr(err))
				counts.failed++
				continue
			}
			for field, outcome := range outcomes {
				if counts.add(outcome) {
					migration.logger.InfoContext(ctx, "migrated msteams receiver template", slog.String("config_id", row.ID), slog.String("org_id", row.OrgID), slog.String("receiver", receiverName), slog.String("field", field), slog.String("outcome", outcome.String()))
				}
				changed = changed || outcome.rewrites()
			}
		}
		if !changed {
			continue
		}

		newReceivers, err := json.Marshal(receivers)
		if err != nil {
			return err
		}
		cfg["receivers"] = newReceivers

		newConfig, err := json.Marshal(cfg)
		if err != nil {
			return err
		}

		if _, err := tx.NewUpdate().
			Model((*msteamsConfigRow)(nil)).
			Set("config = ?", string(newConfig)).
			Set("hash = ?", fmt.Sprintf("%x", md5.Sum(newConfig))).
			Where("id = ?", row.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	migration.logger.InfoContext(ctx, "migrated msteams templates on alertmanager configs", slog.Int("total", len(rows)), slog.Int("replaced", counts.replaced), slog.Int("converted", counts.converted), slog.Int("custom", counts.custom), slog.Int("failed", counts.failed))

	return nil
}

func (migration *migrateMSTeamsDefaultTemplates) migrateChannels(ctx context.Context, tx bun.Tx) error {
	rows := make([]*msteamsChannelRow, 0)
	if err := tx.NewSelect().Model(&rows).Where("type = ?", "msteams").Scan(ctx); err != nil {
		return err
	}

	counts := msteamsMigrationCounts{}
	for _, row := range rows {
		query := tx.NewUpdate().Model((*msteamsChannelRow)(nil)).Where("id = ?", row.ID)
		changed := false

		receiver := make(map[string]json.RawMessage)
		if err := json.Unmarshal([]byte(row.Data), &receiver); err != nil {
			migration.logger.WarnContext(ctx, "skipping notification channel with unreadable data", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID), errors.Attr(err))
			counts.failed++
			continue
		}

		outcomes, err := migrateMSTeamsReceiver(receiver)
		if err != nil {
			migration.logger.WarnContext(ctx, "leaving notification channel templates as is", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID), errors.Attr(err))
			counts.failed++
			continue
		}
		for field, outcome := range outcomes {
			if counts.add(outcome) {
				migration.logger.InfoContext(ctx, "migrated msteams notification channel template", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID), slog.String("field", field), slog.String("outcome", outcome.String()))
			}
			changed = changed || outcome.rewrites()
		}
		if changed {
			newData, err := json.Marshal(receiver)
			if err != nil {
				return err
			}
			query = query.Set("data = ?", string(newData))
		}

		if row.Spec != "" {
			spec := make(map[string]json.RawMessage)
			if err := json.Unmarshal([]byte(row.Spec), &spec); err != nil {
				migration.logger.WarnContext(ctx, "skipping notification channel spec with unreadable json", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID), errors.Attr(err))
			} else {
				specOutcomes, err := migrateMSTeamsFields(spec)
				if err != nil {
					migration.logger.WarnContext(ctx, "leaving notification channel spec templates as is", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID), errors.Attr(err))
				}
				specChanged := false
				for _, outcome := range specOutcomes {
					specChanged = specChanged || outcome.rewrites()
				}
				if err == nil && specChanged {
					newSpec, err := json.Marshal(spec)
					if err != nil {
						return err
					}
					query = query.Set("spec = ?", string(newSpec))
					changed = true
				}
			}
		}

		if !changed {
			continue
		}
		if _, err := query.Exec(ctx); err != nil {
			return err
		}
	}

	migration.logger.InfoContext(ctx, "migrated msteams templates on notification channels", slog.Int("total", len(rows)), slog.Int("replaced", counts.replaced), slog.Int("converted", counts.converted), slog.Int("custom", counts.custom), slog.Int("failed", counts.failed))

	return nil
}

func (outcome msteamsTemplateOutcome) String() string {
	switch outcome {
	case msteamsTemplateReplaced:
		return "replaced"
	case msteamsTemplateConverted:
		return "converted"
	case msteamsTemplateCustom:
		return "custom"
	default:
		return "unchanged"
	}
}

func (outcome msteamsTemplateOutcome) rewrites() bool {
	return outcome == msteamsTemplateReplaced || outcome == msteamsTemplateConverted
}

// add reports whether the outcome is worth a log line of its own.
func (counts *msteamsMigrationCounts) add(outcome msteamsTemplateOutcome) bool {
	switch outcome {
	case msteamsTemplateReplaced:
		counts.replaced++
	case msteamsTemplateConverted:
		counts.converted++
	case msteamsTemplateCustom:
		counts.custom++
	default:
		return false
	}

	return true
}

// migrateMSTeamsReceiver reports the outcome of the receiver's first msteams notifier, the only one a channel carries.
func migrateMSTeamsReceiver(receiver map[string]json.RawMessage) (map[string]msteamsTemplateOutcome, error) {
	configsRaw, ok := receiver[msteamsConfigsKey]
	if !ok || string(configsRaw) == "null" {
		return nil, nil
	}

	configs := make([]map[string]json.RawMessage, 0)
	if err := json.Unmarshal(configsRaw, &configs); err != nil {
		return nil, err
	}

	var outcomes map[string]msteamsTemplateOutcome
	changed := false
	for i, config := range configs {
		configOutcomes, err := migrateMSTeamsFields(config)
		if err != nil {
			return nil, err
		}
		if i == 0 {
			outcomes = configOutcomes
		}
		for _, outcome := range configOutcomes {
			changed = changed || outcome.rewrites()
		}
	}
	if !changed {
		return outcomes, nil
	}

	newConfigs, err := json.Marshal(configs)
	if err != nil {
		return nil, err
	}
	receiver[msteamsConfigsKey] = newConfigs

	return outcomes, nil
}

func migrateMSTeamsFields(object map[string]json.RawMessage) (map[string]msteamsTemplateOutcome, error) {
	outcomes := make(map[string]msteamsTemplateOutcome, 2)

	for _, field := range []string{msteamsTitleField, msteamsTextField} {
		raw, ok := object[field]
		if !ok || string(raw) == "null" {
			continue
		}

		var tmpl string
		if err := json.Unmarshal(raw, &tmpl); err != nil {
			return nil, err
		}

		var (
			migrated string
			outcome  msteamsTemplateOutcome
			err      error
		)
		if field == msteamsTitleField {
			migrated, outcome, err = migrateMSTeamsTitle(tmpl)
		} else {
			migrated, outcome, err = migrateMSTeamsText(tmpl)
		}
		if err != nil {
			return nil, err
		}

		outcomes[field] = outcome
		if !outcome.rewrites() {
			continue
		}

		newRaw, err := json.Marshal(migrated)
		if err != nil {
			return nil, err
		}
		object[field] = newRaw
	}

	return outcomes, nil
}

func migrateMSTeamsTitle(title string) (string, msteamsTemplateOutcome, error) {
	if isMSTeamsDefaultOrEmpty(title, msteamsDefaultTitle) {
		return title, msteamsTemplateUnchanged, nil
	}

	matches, err := matchesAnyMSTeamsTemplate(title, []string{msteamsSlackSeedTitle})
	if err != nil {
		return title, msteamsTemplateUnchanged, err
	}
	if matches {
		return msteamsDefaultTitle, msteamsTemplateReplaced, nil
	}

	return title, msteamsTemplateCustom, nil
}

func migrateMSTeamsText(text string) (string, msteamsTemplateOutcome, error) {
	if isMSTeamsDefaultOrEmpty(text, msteamsDefaultText) {
		return text, msteamsTemplateUnchanged, nil
	}

	matches, err := matchesAnyMSTeamsTemplate(text, msteamsSlackSeedTexts)
	if err != nil {
		return text, msteamsTemplateUnchanged, err
	}
	if matches {
		return msteamsDefaultText, msteamsTemplateReplaced, nil
	}

	if !isMSTeamsSlackSeedDerived(text) {
		return text, msteamsTemplateCustom, nil
	}

	converted := convertMSTeamsSlackSeed(text)
	if _, err := normalizeMSTeamsTemplate(converted); err != nil {
		return text, msteamsTemplateUnchanged, err
	}

	return converted, msteamsTemplateConverted, nil
}

// isMSTeamsDefaultOrEmpty covers what needs no migration: nothing stored, an upstream marker or the new default itself.
func isMSTeamsDefaultOrEmpty(tmpl string, newDefault string) bool {
	trimmed := strings.TrimSpace(tmpl)

	return trimmed == "" || trimmed == newDefault || strings.HasPrefix(trimmed, `{{ template "msteamsv2.default.`) || strings.HasPrefix(trimmed, `{{ template "msteams.default.`)
}

func matchesAnyMSTeamsTemplate(tmpl string, shipped []string) (bool, error) {
	normalized, err := normalizeMSTeamsTemplate(tmpl)
	if err != nil {
		return false, err
	}

	for _, candidate := range shipped {
		normalizedCandidate, err := normalizeMSTeamsTemplate(candidate)
		if err != nil {
			return false, err
		}
		if normalized == normalizedCandidate {
			return true, nil
		}
	}

	return false, nil
}

func isMSTeamsSlackSeedDerived(text string) bool {
	masked, _ := maskMSTeamsActions(text)

	found := 0
	for _, match := range findMSTeamsSlackBold(masked) {
		if slices.Contains(msteamsSlackSeedLabels, masked[match[2]:match[3]]) {
			found++
		}
	}

	return found >= msteamsSlackSeedLabelThreshold
}

// convertMSTeamsSlackSeed rewrites Slack mrkdwn into the markdown a Teams card renders, leaving every {{ }} action as written.
func convertMSTeamsSlackSeed(text string) string {
	text = strings.ReplaceAll(text, msteamsSlackRelatedLinksCall, msteamsMarkdownRelatedLinksCall)
	text = strings.ReplaceAll(text, "\r\n", "\n")

	masked, actions := maskMSTeamsActions(text)

	var bolded strings.Builder
	last := 0
	for _, match := range findMSTeamsSlackBold(masked) {
		bolded.WriteString(masked[last:match[0]])
		bolded.WriteString(fmt.Sprintf("**%s**", masked[match[2]:match[3]]))
		last = match[1]
	}
	bolded.WriteString(masked[last:])
	masked = bolded.String()

	masked = msteamsSlackLinkPattern.ReplaceAllString(masked, "[$2]($1)")
	masked = msteamsSlackBulletPattern.ReplaceAllString(masked, "- ")
	masked = msteamsIndentPattern.ReplaceAllString(masked, "")
	masked = separateMSTeamsParagraphs(masked, actions)

	return msteamsMaskPattern.ReplaceAllStringFunc(masked, func(mask string) string {
		var index int
		_, _ = fmt.Sscanf(strings.TrimSuffix(strings.TrimPrefix(mask, msteamsMaskOpen), msteamsMaskClose), "%d", &index)
		return actions[index]
	})
}

// maskMSTeamsActions swaps each {{ }} action for a placeholder so text rules can span them, as in *{{ .Name }}:*.
func maskMSTeamsActions(text string) (string, []string) {
	actions := make([]string, 0)

	masked := msteamsActionPattern.ReplaceAllStringFunc(text, func(action string) string {
		actions = append(actions, action)
		return fmt.Sprintf("%s%d%s", msteamsMaskOpen, len(actions)-1, msteamsMaskClose)
	})

	return masked, actions
}

// findMSTeamsSlackBold returns the *bold* spans that are not already part of a **bold** one.
func findMSTeamsSlackBold(masked string) [][]int {
	matches := make([][]int, 0)

	for _, match := range msteamsSlackBoldPattern.FindAllStringSubmatchIndex(masked, -1) {
		if match[0] > 0 && masked[match[0]-1] == '*' {
			continue
		}
		if match[1] < len(masked) && masked[match[1]] == '*' {
			continue
		}
		if strings.TrimRight(masked[match[2]:match[3]], " \t") != masked[match[2]:match[3]] {
			continue
		}
		matches = append(matches, match)
	}

	return matches
}

// separateMSTeamsParagraphs puts a blank line between adjacent lines of content, which Teams needs outside a list.
func separateMSTeamsParagraphs(masked string, actions []string) string {
	lines := strings.Split(masked, "\n")

	separated := make([]string, 0, len(lines))
	for i, line := range lines {
		separated = append(separated, line)
		if i == len(lines)-1 {
			continue
		}

		content, list := classifyMSTeamsLine(line, actions)
		nextContent, nextList := classifyMSTeamsLine(lines[i+1], actions)
		if content && nextContent && !(list && nextList) {
			separated = append(separated, "")
		}
	}

	return strings.Join(separated, "\n")
}

// classifyMSTeamsLine reports whether a line renders any text and whether that text is a list item.
func classifyMSTeamsLine(line string, actions []string) (bool, bool) {
	rendered := msteamsMaskPattern.ReplaceAllStringFunc(line, func(mask string) string {
		var index int
		_, _ = fmt.Sscanf(strings.TrimSuffix(strings.TrimPrefix(mask, msteamsMaskOpen), msteamsMaskClose), "%d", &index)
		if isMSTeamsControlAction(actions[index]) {
			return ""
		}
		return mask
	})
	rendered = strings.TrimSpace(rendered)

	return rendered != "", strings.HasPrefix(rendered, "- ")
}

func isMSTeamsControlAction(action string) bool {
	inner := strings.TrimSpace(strings.Trim(strings.TrimSuffix(strings.TrimPrefix(action, "{{"), "}}"), "-"))
	if strings.HasPrefix(inner, "/*") {
		return true
	}

	keyword, _, _ := strings.Cut(inner, " ")

	return slices.Contains(msteamsControlKeywords, keyword)
}

// normalizeMSTeamsTemplate re-emits a parsed template with whitespace collapsed, so two templates that differ only in spacing compare equal.
func normalizeMSTeamsTemplate(tmpl string) (string, error) {
	tree := parse.New("msteams")
	tree.Mode = parse.SkipFuncCheck
	parsed, err := tree.Parse(tmpl, "{{", "}}", map[string]*parse.Tree{})
	if err != nil {
		return "", err
	}

	var builder strings.Builder
	writeNormalizedMSTeamsNode(&builder, parsed.Root)

	return builder.String(), nil
}

func writeNormalizedMSTeamsNode(builder *strings.Builder, node parse.Node) {
	switch node := node.(type) {
	case *parse.ListNode:
		if node == nil {
			return
		}
		for _, child := range node.Nodes {
			writeNormalizedMSTeamsNode(builder, child)
		}
	case *parse.TextNode:
		builder.WriteString(strings.Join(strings.Fields(string(node.Text)), " "))
		builder.WriteString("|")
	case *parse.IfNode:
		writeNormalizedMSTeamsBranch(builder, "if", &node.BranchNode)
	case *parse.RangeNode:
		writeNormalizedMSTeamsBranch(builder, "range", &node.BranchNode)
	case *parse.WithNode:
		writeNormalizedMSTeamsBranch(builder, "with", &node.BranchNode)
	default:
		builder.WriteString(node.String())
	}
}

func writeNormalizedMSTeamsBranch(builder *strings.Builder, keyword string, branch *parse.BranchNode) {
	builder.WriteString(fmt.Sprintf("{{%s %s}}", keyword, branch.Pipe.String()))
	writeNormalizedMSTeamsNode(builder, branch.List)
	if branch.ElseList != nil {
		builder.WriteString("{{else}}")
		writeNormalizedMSTeamsNode(builder, branch.ElseList)
	}
	builder.WriteString("{{end}}")
}
