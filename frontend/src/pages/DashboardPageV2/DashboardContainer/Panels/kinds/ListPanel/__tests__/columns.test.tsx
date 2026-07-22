import { render } from '@testing-library/react';
import type { ColumnType } from 'antd/es/table';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

import type { RawTableRow } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareRawTable';

import { buildListColumns } from '../columns';

const fmt = ((value: unknown): string => `FMT(${String(value)})`) as never;

type Col = ColumnType<RawTableRow>;

function colByKey(cols: readonly Col[], key: string): Col {
	const col = cols.find((c) => c.key === key);
	if (!col) {
		throw new Error(`column ${key} not found`);
	}
	return col;
}

function renderCell(col: Col, value: unknown): HTMLElement {
	// antd calls render(value, record, index); only value matters here.
	const node = (col.render as (v: unknown) => JSX.Element)(value);
	return render(<>{node}</>).container;
}

describe('buildListColumns', () => {
	it('formats the timestamp column for any signal', () => {
		const cols = buildListColumns({
			columns: ['timestamp', 'body'],
			signal: TelemetrytypesSignalDTO.logs,
			formatTimestamp: fmt,
		}) as Col[];
		const ts = colByKey(cols, 'timestamp');
		expect(ts.title).toBe('Timestamp');
		expect(renderCell(ts, '2026-01-01T00:00:00Z').textContent).toBe(
			'FMT(2026-01-01T00:00:00Z)',
		);
	});

	it('normalizes a nanosecond epoch to milliseconds before formatting', () => {
		const cols = buildListColumns({
			columns: ['timestamp'],
			signal: TelemetrytypesSignalDTO.logs,
			formatTimestamp: fmt,
		}) as Col[];
		const ts = colByKey(cols, 'timestamp');
		// 1.7e18 ns → 1.7e12 ms; the formatter must receive the ms value, not raw ns.
		expect(renderCell(ts, '1700000000000000000').textContent).toBe(
			'FMT(1700000000000)',
		);
		expect(renderCell(ts, 1700000000000000000).textContent).toBe(
			'FMT(1700000000000)',
		);
	});

	it('passes an ISO timestamp through unchanged', () => {
		const cols = buildListColumns({
			columns: ['timestamp'],
			signal: TelemetrytypesSignalDTO.logs,
			formatTimestamp: fmt,
		}) as Col[];
		expect(
			renderCell(colByKey(cols, 'timestamp'), '2026-01-01T00:00:00Z').textContent,
		).toBe('FMT(2026-01-01T00:00:00Z)');
	});

	it('leaves the log body column width-less (flexible) and ellipsis-truncated', () => {
		const cols = buildListColumns({
			columns: ['body'],
			signal: TelemetrytypesSignalDTO.logs,
			formatTimestamp: fmt,
		}) as Col[];
		const body = colByKey(cols, 'body');
		expect(body.width).toBeUndefined();
		expect(body.ellipsis).toBe(true);
	});

	it('renders trace http fields as a tag', () => {
		const cols = buildListColumns({
			columns: ['http_method'],
			signal: TelemetrytypesSignalDTO.traces,
			formatTimestamp: fmt,
		}) as Col[];
		expect(renderCell(colByKey(cols, 'http_method'), 'GET').textContent).toBe(
			'GET',
		);
	});

	it('renders trace duration in milliseconds', () => {
		const cols = buildListColumns({
			columns: ['duration_nano'],
			signal: TelemetrytypesSignalDTO.traces,
			formatTimestamp: fmt,
		}) as Col[];
		expect(
			renderCell(colByKey(cols, 'duration_nano'), '1000000').textContent,
		).toContain('ms');
	});

	it('shows N/A for empty trace cells', () => {
		const cols = buildListColumns({
			columns: ['service.name'],
			signal: TelemetrytypesSignalDTO.traces,
			formatTimestamp: fmt,
		}) as Col[];
		expect(renderCell(colByKey(cols, 'service.name'), '').textContent).toBe(
			'N/A',
		);
	});
});
