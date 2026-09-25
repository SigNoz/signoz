package sqlmigration

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"maps"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addChannelConfig struct {
	sqlschema sqlschema.SQLSchema
	logger    *slog.Logger
}

type channelConfigBackfillRow struct {
	bun.BaseModel `bun:"table:notification_channel"`

	ID    string `bun:"id,pk"`
	OrgID string `bun:"org_id"`
	Data  string `bun:"data"`
}

// notifierJSON is one entry of a receiver's *_configs list as stored in
// notification_channel.data.
type notifierJSON map[string]json.RawMessage

type channelConfigBackfillKind struct {
	configsKey string
	kind       string
	convert    func(notifierJSON) (map[string]any, error)
}

var channelConfigBackfillKinds = []channelConfigBackfillKind{
	{configsKey: "slack_configs", kind: "slack", convert: convertSlackNotifierJSON},
	{configsKey: "email_configs", kind: "email", convert: convertEmailNotifierJSON},
	{configsKey: "webhook_configs", kind: "webhook", convert: convertWebhookNotifierJSON},
	{configsKey: "pagerduty_configs", kind: "pagerduty", convert: convertPagerdutyNotifierJSON},
	{configsKey: "opsgenie_configs", kind: "opsgenie", convert: convertOpsgenieNotifierJSON},
	{configsKey: "msteamsv2_configs", kind: "msteams", convert: convertMSTeamsNotifierJSON},
	{configsKey: "googlechat_configs", kind: "googlechat", convert: convertGoogleChatNotifierJSON},
	{configsKey: "jira_configs", kind: "jira", convert: convertJiraNotifierJSON},
	{configsKey: "jsmops_configs", kind: "jsmops", convert: convertJSMOpsNotifierJSON},
	{configsKey: "incidentio_configs", kind: "incidentio", convert: convertIncidentIONotifierJSON},
}

func NewAddChannelConfigFactory(sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_channel_config"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addChannelConfig{sqlschema: sqlschema, logger: ps.Logger}, nil
		},
	)
}

func (migration *addChannelConfig) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up adds the column and fills it from each channel's receiver, as a write
// through a receiver does. A receiver v2 cannot represent, such as one carrying
// several notifiers or a notifier kind v2 does not model, stays NULL and is
// logged; the repair endpoint is the remedy for those.
func (migration *addChannelConfig) Up(ctx context.Context, db *bun.DB) error {
	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("notification_channel"))
	if err != nil {
		return err
	}

	sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, &sqlschema.Column{
		Name:     sqlschema.ColumnName("config"),
		DataType: sqlschema.DataTypeText,
		Nullable: true,
	}, nil)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	rows := make([]*channelConfigBackfillRow, 0)
	if err := tx.NewSelect().Model(&rows).Where("config IS NULL").OrderExpr("org_id, id").Scan(ctx); err != nil {
		return err
	}

	type orgStats struct{ total, filled, unrepresentable int }
	statsByOrg := map[string]*orgStats{}
	for _, row := range rows {
		stats, ok := statsByOrg[row.OrgID]
		if !ok {
			stats = &orgStats{}
			statsByOrg[row.OrgID] = stats
		}
		stats.total++

		channelConfig, err := channelConfigFromReceiverJSON(row.Data)
		if err != nil {
			stats.unrepresentable++
			migration.logger.WarnContext(ctx, "leaving notification channel without a v2 config", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID), errors.Attr(err))
			continue
		}

		encoded, err := marshalUnescaped(channelConfig)
		if err != nil {
			return err
		}

		if _, err := tx.NewUpdate().
			Model((*channelConfigBackfillRow)(nil)).
			Set("config = ?", string(encoded)).
			Where("id = ?", row.ID).
			Exec(ctx); err != nil {
			return err
		}
		stats.filled++
	}

	for _, orgID := range slices.Sorted(maps.Keys(statsByOrg)) {
		stats := statsByOrg[orgID]
		migration.logger.InfoContext(ctx, "filled v2 config on notification channels", slog.String("org_id", orgID), slog.Int("total", stats.total), slog.Int("filled", stats.filled), slog.Int("unrepresentable", stats.unrepresentable))
	}

	return tx.Commit()
}

func (migration *addChannelConfig) Down(context.Context, *bun.DB) error {
	return nil
}

// channelConfigFromReceiverJSON mirrors the v2 read of a stored receiver: one
// notifier of a modelled kind, with the receiver's field names renamed to the
// spec's and its unset templates left out.
func channelConfigFromReceiverJSON(data string) (map[string]any, error) {
	receiver := map[string]json.RawMessage{}
	if err := json.Unmarshal([]byte(data), &receiver); err != nil {
		return nil, err
	}

	total := 0
	var found *channelConfigBackfillKind
	var notifier notifierJSON
	for key, raw := range receiver {
		if !strings.HasSuffix(key, "_configs") {
			continue
		}

		var list []notifierJSON
		if err := json.Unmarshal(raw, &list); err != nil {
			return nil, fmt.Errorf("%s: %w", key, err)
		}
		total += len(list)
		if len(list) == 0 {
			continue
		}

		for i := range channelConfigBackfillKinds {
			if channelConfigBackfillKinds[i].configsKey == key {
				found = &channelConfigBackfillKinds[i]
				notifier = list[0]
			}
		}
	}

	if total > 1 {
		return nil, fmt.Errorf("carries %d notifier configurations; only one per channel is supported", total)
	}
	if found == nil {
		return nil, fmt.Errorf("carries no supported notifier configuration")
	}

	spec, err := found.convert(notifier)
	if err != nil {
		return nil, err
	}

	sendResolved, err := notifier.boolValue("send_resolved")
	if err != nil {
		return nil, err
	}
	spec["sendResolved"] = sendResolved

	return map[string]any{"kind": found.kind, "spec": spec}, nil
}

func convertSlackNotifierJSON(notifier notifierJSON) (map[string]any, error) {
	if err := rejectAnyHTTPAuthJSON(notifier); err != nil {
		return nil, err
	}

	spec := map[string]any{}
	if err := notifier.copyStrings(spec, map[string]string{"api_url": "apiUrl", "channel": "channel"}); err != nil {
		return nil, err
	}
	if err := notifier.copyNonEmptyStrings(spec, map[string]string{"title": "title", "text": "text", "color": "color", "title_link": "titleLink", "pretext": "pretext", "fallback": "fallback", "footer": "footer"}); err != nil {
		return nil, err
	}
	if spec["apiUrl"] == "" {
		return nil, fmt.Errorf("slack: api_url is required")
	}

	fields, err := notifier.objectList("fields")
	if err != nil {
		return nil, err
	}
	if len(fields) > 0 {
		converted := make([]map[string]any, 0, len(fields))
		for _, field := range fields {
			item := map[string]any{}
			if err := field.copyStrings(item, map[string]string{"title": "title", "value": "value"}); err != nil {
				return nil, err
			}
			if field.has("short") {
				short, err := field.boolValue("short")
				if err != nil {
					return nil, err
				}
				item["short"] = short
			}
			converted = append(converted, item)
		}
		spec["fields"] = converted
	}

	actions, err := notifier.objectList("actions")
	if err != nil {
		return nil, err
	}
	if len(actions) > 0 {
		converted := make([]map[string]any, 0, len(actions))
		for _, action := range actions {
			item := map[string]any{}
			if err := action.copyStrings(item, map[string]string{"type": "type", "text": "text", "url": "url", "style": "style", "name": "name", "value": "value"}); err != nil {
				return nil, err
			}
			if action.has("confirm") {
				confirm, err := action.object("confirm")
				if err != nil {
					return nil, err
				}
				confirmation := map[string]any{}
				if err := confirm.copyStrings(confirmation, map[string]string{"text": "text", "title": "title", "ok_text": "okText", "dismiss_text": "dismissText"}); err != nil {
					return nil, err
				}
				item["confirm"] = confirmation
			}
			converted = append(converted, item)
		}
		spec["actions"] = converted
	}

	return spec, nil
}

func convertEmailNotifierJSON(notifier notifierJSON) (map[string]any, error) {
	spec := map[string]any{}
	if err := notifier.copyStrings(spec, map[string]string{"to": "to"}); err != nil {
		return nil, err
	}
	if err := notifier.copyNonEmptyStrings(spec, map[string]string{"html": "html"}); err != nil {
		return nil, err
	}
	if spec["to"] == "" {
		return nil, fmt.Errorf("email: to is required")
	}
	if err := notifier.copyNonEmptyObjects(spec, map[string]string{"headers": "headers"}); err != nil {
		return nil, err
	}

	return spec, nil
}

func convertWebhookNotifierJSON(notifier notifierJSON) (map[string]any, error) {
	spec := map[string]any{}
	if err := notifier.copyStrings(spec, map[string]string{"url": "url"}); err != nil {
		return nil, err
	}
	if spec["url"] == "" {
		return nil, fmt.Errorf("webhook: url is required")
	}

	httpConfig, err := notifier.object("http_config")
	if err != nil {
		return nil, err
	}
	if err := rejectUnsupportedHTTPConfigJSON(httpConfig); err != nil {
		return nil, err
	}

	username, password, err := extractBasicAuthJSON(httpConfig)
	if err != nil {
		return nil, err
	}
	bearerToken, err := extractBearerTokenJSON(httpConfig)
	if err != nil {
		return nil, err
	}
	if (username != "" || password != "") && bearerToken != "" {
		return nil, fmt.Errorf("webhook: basic auth and bearer token cannot be combined")
	}
	spec["username"], spec["password"], spec["bearerToken"] = username, password, bearerToken

	return spec, nil
}

func convertPagerdutyNotifierJSON(notifier notifierJSON) (map[string]any, error) {
	if err := rejectAnyHTTPAuthJSON(notifier); err != nil {
		return nil, err
	}

	spec := map[string]any{}
	if err := notifier.copyStrings(spec, map[string]string{"routing_key": "routingKey", "url": "url", "severity": "severity", "component": "component", "group": "group", "class": "class"}); err != nil {
		return nil, err
	}
	if err := notifier.copyNonEmptyStrings(spec, map[string]string{"source": "source", "client": "client", "client_url": "clientUrl", "description": "description"}); err != nil {
		return nil, err
	}
	if spec["routingKey"] == "" {
		return nil, fmt.Errorf("pagerduty: routing_key is required")
	}

	details, err := notifier.object("details")
	if err != nil {
		return nil, err
	}
	if len(details) > 0 {
		for key, raw := range details {
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, fmt.Errorf("pagerduty: details.%s is not a string", key)
			}
		}
		spec["details"] = notifier["details"]
	}

	return spec, nil
}

func convertOpsgenieNotifierJSON(notifier notifierJSON) (map[string]any, error) {
	if err := rejectAnyHTTPAuthJSON(notifier); err != nil {
		return nil, err
	}

	spec := map[string]any{}
	if err := notifier.copyStrings(spec, map[string]string{"api_key": "apiKey", "api_url": "apiUrl", "priority": "priority"}); err != nil {
		return nil, err
	}
	if err := notifier.copyNonEmptyStrings(spec, map[string]string{"message": "message", "description": "description", "source": "source"}); err != nil {
		return nil, err
	}
	if spec["apiKey"] == "" {
		return nil, fmt.Errorf("opsgenie: api_key is required")
	}
	if err := notifier.copyNonEmptyObjects(spec, map[string]string{"details": "details"}); err != nil {
		return nil, err
	}

	return spec, nil
}

func convertMSTeamsNotifierJSON(notifier notifierJSON) (map[string]any, error) {
	return convertWebhookURLNotifierJSON("msteamsv2", notifier)
}

func convertGoogleChatNotifierJSON(notifier notifierJSON) (map[string]any, error) {
	return convertWebhookURLNotifierJSON("googlechat", notifier)
}

func convertWebhookURLNotifierJSON(name string, notifier notifierJSON) (map[string]any, error) {
	if err := rejectAnyHTTPAuthJSON(notifier); err != nil {
		return nil, err
	}

	spec := map[string]any{}
	if err := notifier.copyStrings(spec, map[string]string{"webhook_url": "webhookUrl"}); err != nil {
		return nil, err
	}
	if err := notifier.copyNonEmptyStrings(spec, map[string]string{"title": "title", "text": "text"}); err != nil {
		return nil, err
	}
	if spec["webhookUrl"] == "" {
		return nil, fmt.Errorf("%s: webhook_url is required", name)
	}

	return spec, nil
}

func convertJiraNotifierJSON(notifier notifierJSON) (map[string]any, error) {
	spec := map[string]any{}
	if err := notifier.copyStrings(spec, map[string]string{"site": "site", "project": "project", "issue_type": "issueType", "priority": "priority", "resolve_transition": "resolveTransition", "reopen_transition": "reopenTransition", "wont_fix_resolution": "wontFixResolution"}); err != nil {
		return nil, err
	}
	if err := notifier.copyNonEmptyStrings(spec, map[string]string{"summary": "summary", "description": "description", "reopen_duration": "reopenDuration"}); err != nil {
		return nil, err
	}
	if err := notifier.copyNonEmptyObjects(spec, map[string]string{"custom_fields": "customFields"}); err != nil {
		return nil, err
	}

	labels, err := notifier.list("labels")
	if err != nil {
		return nil, err
	}
	if len(labels) > 0 {
		spec["labels"] = notifier["labels"]
	}

	httpConfig, err := notifier.object("http_config")
	if err != nil {
		return nil, err
	}
	if err := rejectUnsupportedHTTPConfigJSON(httpConfig); err != nil {
		return nil, err
	}
	if httpConfig.has("authorization") {
		return nil, fmt.Errorf("jira: http_config.authorization is not supported")
	}
	email, apiToken, err := extractBasicAuthJSON(httpConfig)
	if err != nil {
		return nil, err
	}
	spec["email"], spec["apiToken"] = email, apiToken

	for _, required := range []string{"site", "project", "issueType", "email", "apiToken"} {
		if spec[required] == "" {
			return nil, fmt.Errorf("jira: %s is required", required)
		}
	}

	return spec, nil
}

func convertJSMOpsNotifierJSON(notifier notifierJSON) (map[string]any, error) {
	if err := rejectAnyHTTPAuthJSON(notifier); err != nil {
		return nil, err
	}

	spec := map[string]any{}
	if err := notifier.copyStrings(spec, map[string]string{"api_key": "apiKey", "priority": "priority"}); err != nil {
		return nil, err
	}
	if err := notifier.copyNonEmptyStrings(spec, map[string]string{"message": "message", "description": "description", "tags": "tags"}); err != nil {
		return nil, err
	}
	if spec["apiKey"] == "" {
		return nil, fmt.Errorf("jsmops: api_key is required")
	}

	return spec, nil
}

func convertIncidentIONotifierJSON(notifier notifierJSON) (map[string]any, error) {
	if err := rejectAnyHTTPAuthJSON(notifier); err != nil {
		return nil, err
	}

	spec := map[string]any{}
	if err := notifier.copyStrings(spec, map[string]string{"url": "url", "token": "token"}); err != nil {
		return nil, err
	}
	if err := notifier.copyNonEmptyStrings(spec, map[string]string{"title": "title", "description": "description"}); err != nil {
		return nil, err
	}
	if spec["url"] == "" || spec["token"] == "" {
		return nil, fmt.Errorf("incidentio: url and token are required")
	}
	if err := notifier.copyNonEmptyObjects(spec, map[string]string{"metadata": "metadata"}); err != nil {
		return nil, err
	}

	return spec, nil
}

func rejectAnyHTTPAuthJSON(notifier notifierJSON) error {
	httpConfig, err := notifier.object("http_config")
	if err != nil {
		return err
	}
	if httpConfig.has("basic_auth") {
		return fmt.Errorf("http_config.basic_auth is not supported")
	}
	if httpConfig.has("authorization") {
		return fmt.Errorf("http_config.authorization is not supported")
	}

	return rejectUnsupportedHTTPConfigJSON(httpConfig)
}

// rejectUnsupportedHTTPConfigJSON refuses every http_config setting the spec has
// no field for, since a config that dropped it would unauthenticate or reroute
// the channel on the next write. A nil http_config is fine; a present one must
// carry the defaults for follow_redirects and enable_http2.
func rejectUnsupportedHTTPConfigJSON(httpConfig notifierJSON) error {
	if httpConfig == nil {
		return nil
	}

	for _, key := range []string{"oauth2", "http_headers"} {
		if httpConfig.has(key) {
			return fmt.Errorf("http_config.%s is not supported", key)
		}
	}
	for _, key := range []string{"bearer_token", "bearer_token_file", "proxy_url", "no_proxy"} {
		value, err := httpConfig.stringValue(key)
		if err != nil {
			return err
		}
		if value != "" {
			return fmt.Errorf("http_config.%s is not supported", key)
		}
	}
	if httpConfig.has("proxy_from_environment") {
		fromEnvironment, err := httpConfig.boolValue("proxy_from_environment")
		if err != nil {
			return err
		}
		if fromEnvironment {
			return fmt.Errorf("http_config.proxy_from_environment is not supported")
		}
	}

	tlsConfig, err := httpConfig.object("tls_config")
	if err != nil {
		return err
	}
	for key := range tlsConfig {
		if key != "insecure_skip_verify" {
			return fmt.Errorf("http_config.tls_config is not supported")
		}
	}
	if tlsConfig.has("insecure_skip_verify") {
		insecure, err := tlsConfig.boolValue("insecure_skip_verify")
		if err != nil {
			return err
		}
		if insecure {
			return fmt.Errorf("http_config.tls_config is not supported")
		}
	}

	for _, key := range []string{"follow_redirects", "enable_http2"} {
		enabled, err := httpConfig.boolValue(key)
		if err != nil {
			return err
		}
		if !enabled {
			return fmt.Errorf("http_config.%s is not supported", key)
		}
	}

	return nil
}

func extractBasicAuthJSON(httpConfig notifierJSON) (string, string, error) {
	basicAuth, err := httpConfig.object("basic_auth")
	if err != nil {
		return "", "", err
	}
	if basicAuth == nil {
		return "", "", nil
	}

	for key := range basicAuth {
		if key != "username" && key != "password" {
			return "", "", fmt.Errorf("http_config.basic_auth.%s is not supported", key)
		}
	}
	username, err := basicAuth.stringValue("username")
	if err != nil {
		return "", "", err
	}
	password, err := basicAuth.stringValue("password")
	if err != nil {
		return "", "", err
	}

	return username, password, nil
}

func extractBearerTokenJSON(httpConfig notifierJSON) (string, error) {
	authorization, err := httpConfig.object("authorization")
	if err != nil {
		return "", err
	}
	if authorization == nil {
		return "", nil
	}

	for key := range authorization {
		if key != "type" && key != "credentials" {
			return "", fmt.Errorf("http_config.authorization.%s is not supported", key)
		}
	}
	scheme, err := authorization.stringValue("type")
	if err != nil {
		return "", err
	}
	if !strings.EqualFold(scheme, "Bearer") {
		return "", fmt.Errorf("http_config.authorization.type %q is not supported", scheme)
	}

	return authorization.stringValue("credentials")
}

// has reports a key that is present and not null.
func (n notifierJSON) has(key string) bool {
	raw, ok := n[key]
	return ok && string(raw) != "null"
}

func (n notifierJSON) stringValue(key string) (string, error) {
	if !n.has(key) {
		return "", nil
	}
	var value string
	if err := json.Unmarshal(n[key], &value); err != nil {
		return "", fmt.Errorf("%s: %w", key, err)
	}
	return value, nil
}

func (n notifierJSON) boolValue(key string) (bool, error) {
	if !n.has(key) {
		return false, nil
	}
	var value bool
	if err := json.Unmarshal(n[key], &value); err != nil {
		return false, fmt.Errorf("%s: %w", key, err)
	}
	return value, nil
}

func (n notifierJSON) object(key string) (notifierJSON, error) {
	if !n.has(key) {
		return nil, nil
	}
	value := notifierJSON{}
	if err := json.Unmarshal(n[key], &value); err != nil {
		return nil, fmt.Errorf("%s: %w", key, err)
	}
	return value, nil
}

func (n notifierJSON) list(key string) ([]json.RawMessage, error) {
	if !n.has(key) {
		return nil, nil
	}
	var value []json.RawMessage
	if err := json.Unmarshal(n[key], &value); err != nil {
		return nil, fmt.Errorf("%s: %w", key, err)
	}
	return value, nil
}

func (n notifierJSON) objectList(key string) ([]notifierJSON, error) {
	if !n.has(key) {
		return nil, nil
	}
	var value []notifierJSON
	if err := json.Unmarshal(n[key], &value); err != nil {
		return nil, fmt.Errorf("%s: %w", key, err)
	}
	return value, nil
}

// copyStrings writes each field as the spec's plain string, "" when absent.
func (n notifierJSON) copyStrings(spec map[string]any, keys map[string]string) error {
	for from, to := range keys {
		value, err := n.stringValue(from)
		if err != nil {
			return err
		}
		spec[to] = value
	}
	return nil
}

// copyNonEmptyStrings leaves an empty field out, which is how the spec spells
// an unset template.
func (n notifierJSON) copyNonEmptyStrings(spec map[string]any, keys map[string]string) error {
	for from, to := range keys {
		value, err := n.stringValue(from)
		if err != nil {
			return err
		}
		if value != "" {
			spec[to] = value
		}
	}
	return nil
}

func (n notifierJSON) copyNonEmptyObjects(spec map[string]any, keys map[string]string) error {
	for from, to := range keys {
		value, err := n.object(from)
		if err != nil {
			return err
		}
		if len(value) > 0 {
			spec[to] = n[from]
		}
	}
	return nil
}
