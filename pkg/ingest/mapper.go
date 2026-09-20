package ingest

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

// Authoritative identity keys stamped by the gateway's spaceauth processor on
// resource attributes (mirrors antcollector pkg/ingestidentity). They survive
// the OTLP hop, so the storage/query partition stays gateway-authoritative.
const (
	trustedOrgIDKey   = "aivision.org.id"
	trustedSpaceIDKey = "aivision.space.id"
	trustedUserIDKey  = "aivision.user.id"
)

type correlation struct {
	orgID     string
	spaceID   string
	runID     string
	sessionID string
	userID    string
	product   string
	agentName string
}

var correlationKeys = struct {
	org, space, run, session, user, product, agent []string
}{
	org: []string{
		"org_id", "org.id", "organization.id", "tenant", "tenant.id",
	},
	space: []string{
		"space_id", "space.id", "aivision.space.id", "ai.vision.space.id", "ant.space.id",
	},
	run: []string{
		"run_id", "run.id", "agent.run.id", "ai.run.id", "gen_ai.run.id", "gen_ai.request.id",
	},
	session: []string{
		"session_id", "session.id", "agent.session.id", "conversation.id", "gen_ai.session.id", "gen_ai.conversation.id",
	},
	user: []string{
		"user_id", "user.id", "enduser.id", "agent.user.id", "gen_ai.user.id", "ant.username",
	},
	product: []string{
		"product", "product.name", "app.product", "service.namespace", "agent.product", "ant.agent.product",
		// aivision-issued attribute (mirrors the trusted aivision.space.id /
		// aivision.user.id namespace the gateway and agentlens self-instrumentation stamp).
		"aivision.agent.product",
	},
	agent: []string{
		"agent", "agent.name", "gen_ai.agent.name", "gen_ai.agent.id",
	},
}

func extractCorrelation(resource, signal pcommon.Map, configuredOrgID string) correlation {
	lookup := func(keys []string) string {
		for _, attrs := range []pcommon.Map{signal, resource} {
			for _, key := range keys {
				if value, ok := attrs.Get(key); ok {
					return truncate(value.AsString(), 255)
				}
			}
		}
		return ""
	}
	c := correlation{
		orgID:     lookup(correlationKeys.org),
		spaceID:   lookup(correlationKeys.space),
		runID:     lookup(correlationKeys.run),
		sessionID: lookup(correlationKeys.session),
		userID:    lookup(correlationKeys.user),
		product:   lookup(correlationKeys.product),
		agentName: lookup(correlationKeys.agent),
	}
	// Single-organization profile: never trust a client-controlled OTLP
	// attribute for the storage/query boundary.
	if configuredOrgID != "" {
		c.orgID = configuredOrgID
	} else if v, ok := resource.Get(trustedOrgIDKey); ok && v.AsString() != "" {
		// No deployment-level org configured, so use the org supplied by AI Vision:
		// the gateway's spaceauth stamps it from the authenticated ingest token
		// (client copies are stripped), which lets org be produced by the system
		// at registration instead of hardcoded. Read from the resource level only.
		c.orgID = truncate(v.AsString(), 255)
	} else if c.orgID == "" {
		c.orgID = "default"
	}
	// Authoritative space/user identity injected by the gateway's spaceauth
	// processor from the authenticated ingest token. Read only from the
	// resource level (the processor strips any client-supplied copy), so a
	// client can never steer its own storage/query partition. When absent
	// (pre-auth rollout) we keep the client-derived value unchanged.
	if v, ok := resource.Get(trustedSpaceIDKey); ok && v.AsString() != "" {
		c.spaceID = truncate(v.AsString(), 255)
	}
	if v, ok := resource.Get(trustedUserIDKey); ok && v.AsString() != "" {
		c.userID = truncate(v.AsString(), 255)
	}
	if c.agentName == "" {
		c.agentName = attributeString(resource, "service.name")
	}
	return c
}

func attributeString(attrs pcommon.Map, key string) string {
	if value, ok := attrs.Get(key); ok {
		return truncate(value.AsString(), 255)
	}
	return ""
}

func truncate(value string, length int) string {
	runes := []rune(value)
	if len(runes) <= length {
		return value
	}
	return string(runes[:length])
}

func jsonString(value any) (string, error) {
	data, err := json.Marshal(normalizeJSON(value))
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func normalizeJSON(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		result := make(map[string]any, len(typed))
		for key, item := range typed {
			result[key] = normalizeJSON(item)
		}
		return result
	case []any:
		result := make([]any, len(typed))
		for index, item := range typed {
			result[index] = normalizeJSON(item)
		}
		return result
	case float64:
		if math.IsNaN(typed) {
			return "NaN"
		}
		if math.IsInf(typed, 1) {
			return "+Inf"
		}
		if math.IsInf(typed, -1) {
			return "-Inf"
		}
	}
	return value
}

func digest(parts ...string) string {
	hash := sha256.New()
	for _, part := range parts {
		_, _ = hash.Write([]byte(part))
		_, _ = hash.Write([]byte{0})
	}
	return hex.EncodeToString(hash.Sum(nil))
}

func traceIDString(id pcommon.TraceID) string {
	if id.IsEmpty() {
		return ""
	}
	return hex.EncodeToString(id[:])
}

func spanIDString(id pcommon.SpanID) string {
	if id.IsEmpty() {
		return ""
	}
	return hex.EncodeToString(id[:])
}

func timestampArg(ts pcommon.Timestamp) string {
	return strconv.FormatUint(uint64(ts), 10)
}

func finiteFloat(value float64) any {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return nil
	}
	return value
}

func spanEventsJSON(events ptrace.SpanEventSlice) (string, error) {
	result := make([]map[string]any, 0, events.Len())
	for i := 0; i < events.Len(); i++ {
		event := events.At(i)
		result = append(result, map[string]any{
			"timestamp_unix_nano":      strconv.FormatUint(uint64(event.Timestamp()), 10),
			"name":                     event.Name(),
			"attributes":               event.Attributes().AsRaw(),
			"dropped_attributes_count": event.DroppedAttributesCount(),
		})
	}
	return jsonString(result)
}

func spanLinksJSON(links ptrace.SpanLinkSlice) (string, error) {
	result := make([]map[string]any, 0, links.Len())
	for i := 0; i < links.Len(); i++ {
		link := links.At(i)
		result = append(result, map[string]any{
			"trace_id":                 traceIDString(link.TraceID()),
			"span_id":                  spanIDString(link.SpanID()),
			"trace_state":              link.TraceState().AsRaw(),
			"flags":                    uint32(link.Flags()),
			"attributes":               link.Attributes().AsRaw(),
			"dropped_attributes_count": link.DroppedAttributesCount(),
		})
	}
	return jsonString(result)
}

func logBodyText(value pcommon.Value) string {
	switch value.Type() {
	case pcommon.ValueTypeBytes:
		return string(value.Bytes().AsRaw())
	case pcommon.ValueTypeEmpty:
		return ""
	default:
		return value.AsString()
	}
}

// Row contract copied verbatim from the gateway-side oceanbase exporter so
// rows written by either path are column-identical during the cutover window.
const spanInsertColumns = `(
 org_id, space_id, timestamp, trace_id, span_id, parent_span_id, trace_state, flags, span_name, span_kind,
 service_name, start_time_unix_nano, end_time_unix_nano, duration_nano,
 status_code, status_message, resource_schema_url, scope_schema_url,
 scope_name, scope_version, scope_attributes, resource_attributes,
 attributes, events, links, payload, run_id, session_id, user_id, agent_product, agent_name
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`

const spanUpsert = ` ON DUPLICATE KEY UPDATE
 parent_span_id=VALUES(parent_span_id), trace_state=VALUES(trace_state), flags=VALUES(flags),
 span_name=VALUES(span_name), span_kind=VALUES(span_kind), service_name=VALUES(service_name),
 start_time_unix_nano=VALUES(start_time_unix_nano), end_time_unix_nano=VALUES(end_time_unix_nano),
 duration_nano=VALUES(duration_nano), status_code=VALUES(status_code), status_message=VALUES(status_message),
 resource_schema_url=VALUES(resource_schema_url), scope_schema_url=VALUES(scope_schema_url),
 scope_name=VALUES(scope_name), scope_version=VALUES(scope_version), scope_attributes=VALUES(scope_attributes),
 resource_attributes=VALUES(resource_attributes), attributes=VALUES(attributes),
 events=VALUES(events), links=VALUES(links), payload=VALUES(payload), space_id=VALUES(space_id), run_id=VALUES(run_id), session_id=VALUES(session_id),
 user_id=VALUES(user_id), agent_product=VALUES(agent_product), agent_name=VALUES(agent_name)`

// buildSpanRows maps an OTLP trace payload to flat signoz_traces rows. It is
// pure (no IO) so the column contract is golden-testable without a database;
// the args order matches spanInsertColumns exactly.
func buildSpanRows(traces ptrace.Traces, orgID string) ([][]any, error) {
	rows := make([][]any, 0, traces.SpanCount())
	resourceSpans := traces.ResourceSpans()
	for resourceIndex := 0; resourceIndex < resourceSpans.Len(); resourceIndex++ {
		rs := resourceSpans.At(resourceIndex)
		resource := rs.Resource().Attributes()
		resourceJSON, err := jsonString(resource.AsRaw())
		if err != nil {
			return nil, fmt.Errorf("encode trace resource attributes: %w", err)
		}
		serviceName := attributeString(resource, "service.name")
		scopeSpans := rs.ScopeSpans()
		for scopeIndex := 0; scopeIndex < scopeSpans.Len(); scopeIndex++ {
			ss := scopeSpans.At(scopeIndex)
			scope := ss.Scope()
			scopeJSON, err := jsonString(scope.Attributes().AsRaw())
			if err != nil {
				return nil, fmt.Errorf("encode trace scope attributes: %w", err)
			}
			spans := ss.Spans()
			for spanIndex := 0; spanIndex < spans.Len(); spanIndex++ {
				span := spans.At(spanIndex)
				attributesJSON, err := jsonString(span.Attributes().AsRaw())
				if err != nil {
					return nil, fmt.Errorf("encode span attributes: %w", err)
				}
				eventsJSON, err := spanEventsJSON(span.Events())
				if err != nil {
					return nil, fmt.Errorf("encode span events: %w", err)
				}
				linksJSON, err := spanLinksJSON(span.Links())
				if err != nil {
					return nil, fmt.Errorf("encode span links: %w", err)
				}
				traceID := traceIDString(span.TraceID())
				spanID := spanIDString(span.SpanID())
				if traceID == "" {
					traceID = digest("missing-trace-id", resourceJSON, scopeJSON, span.Name(), timestampArg(span.StartTimestamp()))[:32]
				}
				if spanID == "" {
					spanID = digest("missing-span-id", traceID, span.Name(), timestampArg(span.StartTimestamp()), strconv.Itoa(spanIndex))[:16]
				}
				start := uint64(span.StartTimestamp())
				end := uint64(span.EndTimestamp())
				duration := uint64(0)
				if end >= start {
					duration = end - start
				}
				correlation := extractCorrelation(resource, span.Attributes(), orgID)
				payloadJSON, err := jsonString(map[string]any{
					"trace_id": traceID, "span_id": spanID, "parent_span_id": spanIDString(span.ParentSpanID()),
					"name": span.Name(), "kind": span.Kind().String(), "start_time_unix_nano": start,
					"end_time_unix_nano": end, "status_code": int16(span.Status().Code()),
					"status_message": span.Status().Message(), "resource_attributes": resource.AsRaw(),
					"attributes": span.Attributes().AsRaw(), "events": json.RawMessage(eventsJSON), "links": json.RawMessage(linksJSON),
				})
				if err != nil {
					return nil, fmt.Errorf("encode span payload: %w", err)
				}
				rows = append(rows, []any{
					correlation.orgID, correlation.spaceID, strconv.FormatUint(start, 10), traceID, spanID, spanIDString(span.ParentSpanID()), span.TraceState().AsRaw(), uint32(span.Flags()),
					truncate(span.Name(), 512), span.Kind().String(), serviceName,
					strconv.FormatUint(start, 10), strconv.FormatUint(end, 10), strconv.FormatUint(duration, 10),
					int16(span.Status().Code()), span.Status().Message(), truncate(rs.SchemaUrl(), 512), truncate(ss.SchemaUrl(), 512),
					truncate(scope.Name(), 255), truncate(scope.Version(), 255), scopeJSON, resourceJSON, attributesJSON,
					eventsJSON, linksJSON, payloadJSON, correlation.runID, correlation.sessionID, correlation.userID, correlation.product, correlation.agentName,
				})
			}
		}
	}
	return rows, nil
}

const logInsertColumns = `(
 org_id, space_id, log_id, timestamp, timestamp_unix_nano, observed_time_unix_nano, trace_id, span_id, flags,
 severity_number, severity_text, severity, event_name, body_text, body, body_json, service_name,
 resource_schema_url, scope_schema_url, scope_name, scope_version, scope_attributes,
 resource_attributes, attributes, payload, run_id, session_id, user_id, agent_product, agent_name
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`

const logUpsert = ` ON DUPLICATE KEY UPDATE
 timestamp_unix_nano=VALUES(timestamp_unix_nano), observed_time_unix_nano=VALUES(observed_time_unix_nano),
 trace_id=VALUES(trace_id), span_id=VALUES(span_id), flags=VALUES(flags), severity_number=VALUES(severity_number),
 severity_text=VALUES(severity_text), severity=VALUES(severity), event_name=VALUES(event_name), body_text=VALUES(body_text),
 body=VALUES(body), body_json=VALUES(body_json),
 service_name=VALUES(service_name), resource_schema_url=VALUES(resource_schema_url), scope_schema_url=VALUES(scope_schema_url),
 scope_name=VALUES(scope_name), scope_version=VALUES(scope_version), scope_attributes=VALUES(scope_attributes),
 resource_attributes=VALUES(resource_attributes), attributes=VALUES(attributes), payload=VALUES(payload), space_id=VALUES(space_id), run_id=VALUES(run_id),
 session_id=VALUES(session_id), user_id=VALUES(user_id), agent_product=VALUES(agent_product), agent_name=VALUES(agent_name)`

// buildLogRows maps an OTLP log payload to flat signoz_logs rows. Pure; the
// args order matches logInsertColumns exactly (verbatim port of pushLogs).
func buildLogRows(logs plog.Logs, orgID string) ([][]any, error) {
	rows := make([][]any, 0, logs.LogRecordCount())
	resourceLogs := logs.ResourceLogs()
	for resourceIndex := 0; resourceIndex < resourceLogs.Len(); resourceIndex++ {
		rl := resourceLogs.At(resourceIndex)
		resource := rl.Resource().Attributes()
		resourceJSON, err := jsonString(resource.AsRaw())
		if err != nil {
			return nil, fmt.Errorf("encode log resource attributes: %w", err)
		}
		serviceName := attributeString(resource, "service.name")
		scopeLogs := rl.ScopeLogs()
		for scopeIndex := 0; scopeIndex < scopeLogs.Len(); scopeIndex++ {
			sl := scopeLogs.At(scopeIndex)
			scope := sl.Scope()
			scopeJSON, err := jsonString(scope.Attributes().AsRaw())
			if err != nil {
				return nil, fmt.Errorf("encode log scope attributes: %w", err)
			}
			records := sl.LogRecords()
			for recordIndex := 0; recordIndex < records.Len(); recordIndex++ {
				record := records.At(recordIndex)
				attributesJSON, err := jsonString(record.Attributes().AsRaw())
				if err != nil {
					return nil, fmt.Errorf("encode log attributes: %w", err)
				}
				bodyJSON, err := jsonString(record.Body().AsRaw())
				if err != nil {
					return nil, fmt.Errorf("encode log body: %w", err)
				}
				timestamp := record.Timestamp()
				if timestamp == 0 {
					timestamp = record.ObservedTimestamp()
				}
				eventName := attributeString(record.Attributes(), "event.name")
				if eventName == "" {
					eventName = attributeString(record.Attributes(), "event_name")
				}
				logIDSeed := attributeString(record.Attributes(), "log.record.uid")
				if logIDSeed == "" {
					logIDSeed = attributeString(record.Attributes(), "event.id")
				}
				if logIDSeed == "" {
					logIDSeed = strings.Join([]string{
						resourceJSON, scopeJSON, timestampArg(timestamp), timestampArg(record.ObservedTimestamp()),
						traceIDString(record.TraceID()), spanIDString(record.SpanID()), record.SeverityText(),
						bodyJSON, attributesJSON,
					}, "\x00")
				}
				logID := digest(logIDSeed)
				correlation := extractCorrelation(resource, record.Attributes(), orgID)
				bodyText := logBodyText(record.Body())
				payloadJSON, err := jsonString(map[string]any{
					"timestamp_unix_nano": uint64(timestamp), "observed_time_unix_nano": uint64(record.ObservedTimestamp()),
					"trace_id": traceIDString(record.TraceID()), "span_id": spanIDString(record.SpanID()),
					"severity_number": int16(record.SeverityNumber()), "severity_text": record.SeverityText(),
					"body": record.Body().AsRaw(), "resource_attributes": resource.AsRaw(), "attributes": record.Attributes().AsRaw(),
				})
				if err != nil {
					return nil, fmt.Errorf("encode log payload: %w", err)
				}
				rows = append(rows, []any{
					correlation.orgID, correlation.spaceID, logID, timestampArg(timestamp), timestampArg(timestamp), timestampArg(record.ObservedTimestamp()),
					traceIDString(record.TraceID()), spanIDString(record.SpanID()), uint32(record.Flags()),
					int16(record.SeverityNumber()), truncate(record.SeverityText(), 64), truncate(record.SeverityText(), 64), eventName,
					bodyText, bodyText, bodyJSON, serviceName,
					truncate(rl.SchemaUrl(), 512), truncate(sl.SchemaUrl(), 512), truncate(scope.Name(), 255), truncate(scope.Version(), 255),
					scopeJSON, resourceJSON, attributesJSON, payloadJSON, correlation.runID, correlation.sessionID,
					correlation.userID, correlation.product, correlation.agentName,
				})
			}
		}
	}
	return rows, nil
}
