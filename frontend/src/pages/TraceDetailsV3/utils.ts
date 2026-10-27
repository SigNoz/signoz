import type { SpantypesWaterfallSpanDTO } from 'api/generated/services/sigNoz.schemas';
import { pick } from 'lodash-es';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { COLOR_BY_OPTIONS } from './constants';
import {
	ColorPair,
	generateColorPair,
	RESERVED_ERROR,
} from './utils/generateColorPair';

/** Like `||`, but keeps `0` and `false`. */
const valueOrUndefined = <T>(value: T): T | undefined =>
	value || value === 0 || value === false ? value : undefined;

/**
 * Look up an attribute from both `resource` and `attributes` on a span.
 * Resources are checked first (service.name, k8s.* etc. live there).
 * Falsy values count as missing, except `0` and `false`.
 *
 * Accepts both `SpanV3` (waterfall) and `FlamegraphSpan` (flamegraph) by typing
 * structurally — the only fields touched are `resource` and `attributes`.
 *
 * TODO: Remove tagMap fallback when phasing out V2
 */
export function getSpanAttribute(
	span: {
		resource?: Record<string, string>;
		attributes?: Record<string, any>;
		tagMap?: Record<string, any>;
	},
	key: string,
): string | number | boolean | undefined {
	return (
		valueOrUndefined(span.resource?.[key]) ??
		valueOrUndefined(span.attributes?.[key]) ??
		valueOrUndefined(span.tagMap?.[key])
	);
}

const INFRA_METADATA_KEYS = [
	'k8s.cluster.name',
	'k8s.pod.name',
	'k8s.node.name',
	'host.name',
] as const;

/**
 * Check if span has infrastructure metadata (k8s/host).
 * TODO: Remove tagMap fallback when phasing out V2
 */
export function hasInfraMetadata(span: SpanV3 | undefined): boolean {
	if (!span) {
		return false;
	}
	return INFRA_METADATA_KEYS.some((key) => getSpanAttribute(span, key));
}

// Top-level fields shown in the Span Details DataViewer. Everything else on the
// API response (e.g. waterfall rendering data) is hidden.
const VISIBLE_SPAN_FIELDS_IN_DETAILS_VIEW = [
	'span_id',
	'trace_id',
	'parent_span_id',
	'name',
	'kind_string',
	'duration_nano',
	'has_error',
	'status_code',
	'status_code_string',
	'status_message',
	'flags',
	'is_remote',
	'trace_state',
	'attributes',
	'resource',
	'events',
	'references',
	'http_method',
	'http_url',
	'http_host',
	'db_name',
	'db_operation',
	'external_http_method',
	'external_http_url',
	'response_status_code',
	// Keys must exist on the waterfall DTO.
] as const satisfies readonly (keyof SpantypesWaterfallSpanDTO)[];

/**
 * Shallow-copies the allow-listed span fields, for display in the Span Details
 * DataViewer.
 */
export function getSpanDisplayData(span: SpanV3): Record<string, unknown> {
	return pick(span, VISIBLE_SPAN_FIELDS_IN_DETAILS_VIEW);
}

/**
 * V3 pinned-attribute entries are JSON-stringified arrays (e.g.
 * `'["attributes","http.method"]'`). Legacy V2 entries are flat strings.
 * Used to distinguish V3 from V2 entries when reading the persisted value.
 */
export function isV3PinnedAttribute(entry: string): boolean {
	try {
		return Array.isArray(JSON.parse(entry));
	} catch {
		return false;
	}
}

/**
 * Reads the value used to group a span for color-by purposes. Falls back to
 * `"unknown"` so all unattributed spans share a single colour rather than
 * appearing as missing data.
 */
export function getSpanGroupValue(
	span: SpanV3,
	colorByFieldName: string,
): string {
	return String(getSpanAttribute(span, colorByFieldName) ?? 'unknown');
}

/**
 * Resolves the rendering colour for a span. Error spans always get the
 * reserved error colour; everything else is derived deterministically from its
 * group value via `generateColorPair`. Returns both the base color and a
 * darkened variant for light-mode hover/selected foregrounds.
 */
export function resolveSpanColor(
	span: SpanV3,
	colorByFieldName: string,
): ColorPair {
	if (span.has_error) {
		return { color: RESERVED_ERROR, colorDark: RESERVED_ERROR };
	}
	return generateColorPair(getSpanGroupValue(span, colorByFieldName));
}

/**
 * Color-by fields present on any of the given spans — replaces the old
 * server-side aggregation gating. `service.name` is always offered by the store
 * regardless of this list.
 */
export function getAvailableColorByFieldNames(spans: SpanV3[]): string[] {
	return COLOR_BY_OPTIONS.filter((opt) =>
		spans.some((s) => getSpanAttribute(s, opt.field.name)),
	).map((opt) => opt.field.name);
}
