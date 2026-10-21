package sqlmigration

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"text/template/parse"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

const (
	relatedLinksSlackHeader = "*RelatedLogs:*"
)

var (
	relatedLinksActionPattern = regexp.MustCompile(`(?s)\{\{-?(.*?)-?\}\}`)

	relatedLinksSlackKind = relatedLinksChannelKind{
		configsKey:  "slack_configs",
		field:       "text",
		replacement: `{{ template "signoz.relatedLinks.slack" . }}`,
		defaults: []string{
			"*RelatedLogs:* {{ .Annotations.related_logs }}\n     *RelatedTraces:* {{ .Annotations.related_traces }}",
			"*RelatedLogs:* {{ if gt (len .Annotations.related_logs) 0 -}} View in <{{ .Annotations.related_logs }}|logs explorer> {{- end}}\n     *RelatedTraces:* {{ if gt (len .Annotations.related_traces) 0 -}} View in <{{ .Annotations.related_traces }}|traces explorer> {{- end}}",
		},
	}

	relatedLinksMSTeamsKind = relatedLinksChannelKind{
		configsKey:  "msteamsv2_configs",
		field:       "text",
		replacement: relatedLinksSlackKind.replacement,
		defaults:    relatedLinksSlackKind.defaults,
	}

	relatedLinksIncidentIOKind = relatedLinksChannelKind{
		configsKey:  "incidentio_configs",
		field:       "description",
		replacement: `{{ template "signoz.relatedLinks.markdown" . }}`,
		defaults: []string{
			"{{ if .Annotations.related_logs }}[View related logs]({{ .Annotations.related_logs }})\n\n{{ end }}{{ if .Annotations.related_traces }}[View related traces]({{ .Annotations.related_traces }})\n\n{{ end }}",
		},
	}

	relatedLinksJSMOpsKind = relatedLinksChannelKind{
		configsKey:  "jsmops_configs",
		field:       "description",
		replacement: relatedLinksIncidentIOKind.replacement,
		defaults:    relatedLinksIncidentIOKind.defaults,
	}

	relatedLinksTelegramKind = relatedLinksChannelKind{
		configsKey:  "telegram_configs",
		field:       "message",
		replacement: `{{ template "signoz.relatedLinks.html" . }}`,
		defaults: []string{
			"{{ if .Annotations.related_logs }}<a href=\"{{ .Annotations.related_logs | html }}\">View related logs</a>\n{{ end }}{{ if .Annotations.related_traces }}<a href=\"{{ .Annotations.related_traces | html }}\">View related traces</a>\n{{ end }}",
		},
	}

	relatedLinksKindsByChannelType = map[string]relatedLinksChannelKind{
		"slack":      relatedLinksSlackKind,
		"msteams":    relatedLinksMSTeamsKind,
		"incidentio": relatedLinksIncidentIOKind,
		"jsmops":     relatedLinksJSMOpsKind,
		"telegram":   relatedLinksTelegramKind,
	}

	errRelatedLinksCustomised   = errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "related links section differs from the shipped defaults")
	errRelatedLinksUnrecognised = errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "related links section not in the expected shape")
)

type migrateRelatedLinksTemplate struct {
	logger *slog.Logger
}

func NewMigrateRelatedLinksTemplateFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_related_links_template"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateRelatedLinksTemplate{logger: ps.Logger}, nil
		},
	)
}

func (migration *migrateRelatedLinksTemplate) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *migrateRelatedLinksTemplate) Up(ctx context.Context, db *bun.DB) error {
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

func (migration *migrateRelatedLinksTemplate) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *migrateRelatedLinksTemplate) migrateConfigs(ctx context.Context, tx bun.Tx) error {
	rows := make([]*relatedLinksConfigRow, 0)
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		cfg := make(map[string]json.RawMessage)
		if err := json.Unmarshal([]byte(row.Config), &cfg); err != nil {
			migration.logger.WarnContext(ctx, "skipping alertmanager config with unreadable config", slog.String("config_id", row.ID), errors.Attr(err))
			continue
		}

		receiversRaw, ok := cfg["receivers"]
		if !ok || string(receiversRaw) == "null" {
			continue
		}

		receivers := make([]map[string]json.RawMessage, 0)
		if err := json.Unmarshal(receiversRaw, &receivers); err != nil {
			migration.logger.WarnContext(ctx, "skipping alertmanager config with unreadable receivers", slog.String("config_id", row.ID), errors.Attr(err))
			continue
		}

		changed := false
		for _, receiver := range receivers {
			var receiverName string
			_ = json.Unmarshal(receiver["name"], &receiverName)

			for _, kind := range []relatedLinksChannelKind{relatedLinksSlackKind, relatedLinksMSTeamsKind, relatedLinksIncidentIOKind, relatedLinksJSMOpsKind, relatedLinksTelegramKind} {
				rewritten, err := rewriteRelatedLinksInReceiver(receiver, kind)
				if err != nil {
					migration.logger.WarnContext(ctx, "leaving receiver related links template as is", slog.String("config_id", row.ID), slog.String("receiver", receiverName), slog.String("configs_key", kind.configsKey), errors.Attr(err))
				}
				changed = changed || rewritten
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
			Model((*relatedLinksConfigRow)(nil)).
			Set("config = ?", string(newConfig)).
			Set("hash = ?", fmt.Sprintf("%x", md5.Sum(newConfig))).
			Where("id = ?", row.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	return nil
}

func (migration *migrateRelatedLinksTemplate) migrateChannels(ctx context.Context, tx bun.Tx) error {
	channelTypes := make([]string, 0, len(relatedLinksKindsByChannelType))
	for channelType := range relatedLinksKindsByChannelType {
		channelTypes = append(channelTypes, channelType)
	}

	rows := make([]*relatedLinksChannelRow, 0)
	if err := tx.NewSelect().Model(&rows).Where("type IN (?)", bun.In(channelTypes)).Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		kind := relatedLinksKindsByChannelType[row.Type]

		query := tx.NewUpdate().Model((*relatedLinksChannelRow)(nil)).Where("id = ?", row.ID)
		changed := false

		receiver := make(map[string]json.RawMessage)
		if err := json.Unmarshal([]byte(row.Data), &receiver); err != nil {
			migration.logger.WarnContext(ctx, "skipping notification channel with unreadable data", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID), errors.Attr(err))
			continue
		}
		dataChanged, err := rewriteRelatedLinksInReceiver(receiver, kind)
		if err != nil {
			migration.logger.WarnContext(ctx, "leaving notification channel data template as is", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID), errors.Attr(err))
		}
		if dataChanged {
			newData, err := json.Marshal(receiver)
			if err != nil {
				return err
			}
			query = query.Set("data = ?", string(newData))
			changed = true
		}

		if row.Spec != "" {
			spec := make(map[string]json.RawMessage)
			if err := json.Unmarshal([]byte(row.Spec), &spec); err != nil {
				migration.logger.WarnContext(ctx, "skipping notification channel spec with unreadable json", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID), errors.Attr(err))
			} else {
				specChanged, err := rewriteRelatedLinksInField(spec, kind)
				if err != nil {
					migration.logger.WarnContext(ctx, "leaving notification channel spec template as is", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID), errors.Attr(err))
				}
				if specChanged {
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

	return nil
}

type relatedLinksChannelKind struct {
	configsKey  string
	field       string
	replacement string
	defaults    []string
}

type relatedLinksConfigRow struct {
	bun.BaseModel `bun:"table:alertmanager_config"`

	ID     string `bun:"id"`
	Config string `bun:"config"`
}

type relatedLinksChannelRow struct {
	bun.BaseModel `bun:"table:notification_channel"`

	ID    string `bun:"id"`
	OrgID string `bun:"org_id"`
	Type  string `bun:"type"`
	Data  string `bun:"data"`
	Spec  string `bun:"spec,nullzero"`
}

// relatedLinksChunk is one text run or one {{...}} action of a template, with
// its byte span in the source and the action's trimmed inner text.
type relatedLinksChunk struct {
	start  int
	end    int
	action bool
	inner  string
}

func rewriteRelatedLinksInReceiver(receiver map[string]json.RawMessage, kind relatedLinksChannelKind) (bool, error) {
	configsRaw, ok := receiver[kind.configsKey]
	if !ok || string(configsRaw) == "null" {
		return false, nil
	}

	configs := make([]map[string]json.RawMessage, 0)
	if err := json.Unmarshal(configsRaw, &configs); err != nil {
		return false, err
	}

	changed := false
	var firstErr error
	for _, config := range configs {
		fieldChanged, err := rewriteRelatedLinksInField(config, kind)
		if err != nil && firstErr == nil {
			firstErr = err
		}
		changed = changed || fieldChanged
	}
	if !changed {
		return false, firstErr
	}

	newConfigs, err := json.Marshal(configs)
	if err != nil {
		return false, err
	}
	receiver[kind.configsKey] = newConfigs

	return true, firstErr
}

func rewriteRelatedLinksInField(object map[string]json.RawMessage, kind relatedLinksChannelKind) (bool, error) {
	fieldRaw, ok := object[kind.field]
	if !ok || string(fieldRaw) == "null" {
		return false, nil
	}

	var tmpl string
	if err := json.Unmarshal(fieldRaw, &tmpl); err != nil {
		return false, err
	}

	rewritten, changed, err := rewriteRelatedLinks(tmpl, kind)
	if err != nil || !changed {
		return false, err
	}

	newField, err := json.Marshal(rewritten)
	if err != nil {
		return false, err
	}
	object[kind.field] = newField

	return true, nil
}

// rewriteRelatedLinks swaps the related links section of tmpl for the kind's
// block call. It returns the input unchanged when tmpl never references the
// related links annotations, and an error when it does but the section was
// customised, is not in the expected shape or does not parse.
func rewriteRelatedLinks(tmpl string, kind relatedLinksChannelKind) (string, bool, error) {
	chunks := lexRelatedLinksChunks(tmpl)
	start, end, found := findRelatedLinksSection(tmpl, chunks)
	if !found {
		if indexRelatedLinksAction(chunks, 0, "related_logs") >= 0 || indexRelatedLinksAction(chunks, 0, "related_traces") >= 0 {
			return tmpl, false, errRelatedLinksUnrecognised
		}
		return tmpl, false, nil
	}

	section, err := normalizeRelatedLinksTemplate(tmpl[start:end])
	if err != nil {
		return tmpl, false, err
	}

	matched := false
	for _, shipped := range kind.defaults {
		normalized, err := normalizeRelatedLinksTemplate(shipped)
		if err != nil {
			return tmpl, false, err
		}
		if section == normalized {
			matched = true
			break
		}
	}
	if !matched {
		return tmpl, false, errRelatedLinksCustomised
	}

	rewritten := tmpl[:start] + kind.replacement + tmpl[end:]
	if _, err := normalizeRelatedLinksTemplate(rewritten); err != nil {
		return tmpl, false, err
	}

	return rewritten, true, nil
}

func lexRelatedLinksChunks(tmpl string) []relatedLinksChunk {
	var chunks []relatedLinksChunk

	pos := 0
	for _, match := range relatedLinksActionPattern.FindAllStringSubmatchIndex(tmpl, -1) {
		if match[0] > pos {
			chunks = append(chunks, relatedLinksChunk{start: pos, end: match[0]})
		}
		chunks = append(chunks, relatedLinksChunk{start: match[0], end: match[1], action: true, inner: strings.TrimSpace(tmpl[match[2]:match[3]])})
		pos = match[1]
	}
	if pos < len(tmpl) {
		chunks = append(chunks, relatedLinksChunk{start: pos, end: len(tmpl)})
	}

	return chunks
}

// findRelatedLinksSection spans from the first action naming related_logs (or
// the Slack header text before it) to the end of the first action naming
// related_traces that follows.
func findRelatedLinksSection(tmpl string, chunks []relatedLinksChunk) (int, int, bool) {
	logsIdx := indexRelatedLinksAction(chunks, 0, "related_logs")
	if logsIdx < 0 {
		return 0, 0, false
	}
	logsEnd := indexRelatedLinksBlockEnd(chunks, logsIdx)
	if logsEnd < 0 {
		return 0, 0, false
	}

	tracesIdx := indexRelatedLinksAction(chunks, logsEnd+1, "related_traces")
	if tracesIdx < 0 {
		return 0, 0, false
	}
	tracesEnd := indexRelatedLinksBlockEnd(chunks, tracesIdx)
	if tracesEnd < 0 {
		return 0, 0, false
	}

	start := chunks[logsIdx].start
	if logsIdx > 0 && !chunks[logsIdx-1].action {
		previous := tmpl[chunks[logsIdx-1].start:chunks[logsIdx-1].end]
		if header := strings.LastIndex(previous, relatedLinksSlackHeader); header >= 0 {
			start = chunks[logsIdx-1].start + header
		}
	}

	return start, chunks[tracesEnd].end, true
}

func indexRelatedLinksAction(chunks []relatedLinksChunk, from int, annotation string) int {
	for i := from; i < len(chunks); i++ {
		if chunks[i].action && strings.Contains(chunks[i].inner, annotation) {
			return i
		}
	}

	return -1
}

// indexRelatedLinksBlockEnd returns the chunk closing the block opened at idx,
// or idx itself for a bare action.
func indexRelatedLinksBlockEnd(chunks []relatedLinksChunk, idx int) int {
	if !opensRelatedLinksBlock(chunks[idx].inner) {
		return idx
	}

	depth := 0
	for i := idx; i < len(chunks); i++ {
		if !chunks[i].action {
			continue
		}
		if opensRelatedLinksBlock(chunks[i].inner) {
			depth++
			continue
		}
		if chunks[i].inner == "end" {
			depth--
			if depth == 0 {
				return i
			}
		}
	}

	return -1
}

func opensRelatedLinksBlock(inner string) bool {
	for _, keyword := range []string{"if ", "range ", "with ", "define ", "block "} {
		if strings.HasPrefix(inner, keyword) {
			return true
		}
	}

	return false
}

// normalizeRelatedLinksTemplate re-emits a parsed template with action spacing
// canonicalised and text runs collapsed to single spaces, so two snippets that
// differ only in whitespace compare equal.
func normalizeRelatedLinksTemplate(tmpl string) (string, error) {
	tree := parse.New("related_links")
	tree.Mode = parse.SkipFuncCheck
	parsed, err := tree.Parse(tmpl, "{{", "}}", map[string]*parse.Tree{})
	if err != nil {
		return "", err
	}

	var builder strings.Builder
	writeNormalizedRelatedLinksNode(&builder, parsed.Root)

	return builder.String(), nil
}

func writeNormalizedRelatedLinksNode(builder *strings.Builder, node parse.Node) {
	switch node := node.(type) {
	case *parse.ListNode:
		for _, child := range node.Nodes {
			writeNormalizedRelatedLinksNode(builder, child)
		}
	case *parse.TextNode:
		builder.WriteString(strings.Join(strings.Fields(string(node.Text)), " "))
		builder.WriteString("|")
	case *parse.IfNode:
		builder.WriteString("{{if ")
		builder.WriteString(node.Pipe.String())
		builder.WriteString("}}")
		writeNormalizedRelatedLinksNode(builder, node.List)
		if node.ElseList != nil {
			builder.WriteString("{{else}}")
			writeNormalizedRelatedLinksNode(builder, node.ElseList)
		}
		builder.WriteString("{{end}}")
	default:
		builder.WriteString(node.String())
	}
}
