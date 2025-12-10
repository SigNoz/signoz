import { mockAllAvailableKeys } from 'container/OptionsMenu/__tests__/mockData';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import { renderColumnHeader } from 'tests/columnHeaderHelpers';
import { IField } from 'types/api/logs/fields';

import { getLogPanelColumnsList } from '../utils';

const COLUMN_UNDEFINED_ERROR = 'statusCodeColumn is undefined';

// Mock the timezone formatter
const mockFormatTimezoneAdjustedTimestamp = jest.fn(
	(input: TimestampInput): string => {
		if (typeof input === 'string') {
			return new Date(input).toISOString();
		}
		if (typeof input === 'number') {
			return new Date(input / 1e6).toISOString();
		}
		return new Date(input).toISOString();
	},
);

describe('getLogPanelColumnsList - Column Headers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows tooltip icon when conflicting variant exists in allAvailableKeys', () => {
		// Even with single variant selected, tooltip should appear if conflicting variant exists
		const selectedLogFields: IField[] = [
			{
				// eslint-disable-next-line sonarjs/no-duplicate-string
				name: 'http.status_code',
				dataType: 'string',
				type: 'attribute',
			} as IField,
		];

		const columns = getLogPanelColumnsList(
			selectedLogFields,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys, // Contains number variant
		);

		const statusCodeColumn = columns.find(
			(col) => 'dataIndex' in col && col.dataIndex === 'http.status_code',
		);

		expect(statusCodeColumn).toBeDefined();
		expect(statusCodeColumn?.title).toBeDefined();

		// Verify that _hasUnselectedConflict metadata is set correctly
		const columnRecord = statusCodeColumn as Record<string, unknown>;
		expect(columnRecord._hasUnselectedConflict).toBe(true);

		if (!statusCodeColumn) {
			throw new Error(COLUMN_UNDEFINED_ERROR);
		}

		const { container } = renderColumnHeader(statusCodeColumn);
		expect(container.textContent).toContain('http.status_code (string)');

		// Tooltip icon should appear
		// eslint-disable-next-line sonarjs/no-duplicate-string
		const tooltipIcon = container.querySelector('.anticon-info-circle');
		expect(tooltipIcon).toBeInTheDocument();
	});

	it('shows tooltip icon when unselected conflicting variant exists', () => {
		const selectedLogFields: IField[] = [
			{
				name: 'http.status_code',
				dataType: 'string',
				type: 'attribute',
			} as IField,
		];

		const columns = getLogPanelColumnsList(
			selectedLogFields,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys, // Contains number variant
		);

		const statusCodeColumn = columns.find(
			(col) => 'dataIndex' in col && col.dataIndex === 'http.status_code',
		);

		expect(statusCodeColumn).toBeDefined();

		// Verify that _hasUnselectedConflict metadata is set correctly
		const columnRecord = statusCodeColumn as Record<string, unknown>;
		expect(columnRecord._hasUnselectedConflict).toBe(true);

		if (!statusCodeColumn) {
			throw new Error(COLUMN_UNDEFINED_ERROR);
		}

		const { container } = renderColumnHeader(statusCodeColumn);
		const tooltipIcon = container.querySelector('.anticon-info-circle');
		expect(tooltipIcon).toBeInTheDocument();
	});

	it('hides tooltip icon when all conflicting variants are selected', () => {
		const selectedLogFields: IField[] = [
			{
				name: 'http.status_code',
				dataType: 'string',
				type: 'attribute',
			} as IField,
			{
				name: 'http.status_code',
				dataType: 'number',
				type: 'attribute',
			} as IField,
		];

		const columns = getLogPanelColumnsList(
			selectedLogFields,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys,
		);

		const statusCodeColumn = columns.find(
			(col) => 'dataIndex' in col && col.dataIndex === 'http.status_code',
		);

		expect(statusCodeColumn).toBeDefined();

		// Verify that _hasUnselectedConflict metadata is NOT set when all variants are selected
		const columnRecord = statusCodeColumn as Record<string, unknown>;
		expect(columnRecord._hasUnselectedConflict).toBeUndefined();

		if (!statusCodeColumn) {
			throw new Error(COLUMN_UNDEFINED_ERROR);
		}

		const { container } = renderColumnHeader(statusCodeColumn);
		const tooltipIcon = container.querySelector('.anticon-info-circle');
		expect(tooltipIcon).not.toBeInTheDocument();
	});

	it('handles backwards compatibility with string titles', () => {
		const selectedLogFields: IField[] = [
			{
				name: 'trace_id',
				dataType: 'string',
				type: 'attribute',
			} as IField,
		];

		const columns = getLogPanelColumnsList(
			selectedLogFields,
			mockFormatTimezoneAdjustedTimestamp,
			[], // No available keys, so no conflict
		);

		const traceIdColumn = columns.find(
			(col) => 'dataIndex' in col && col.dataIndex === 'trace_id',
		);

		expect(traceIdColumn).toBeDefined();
		expect(typeof traceIdColumn?.title).toBe('string');
		expect(traceIdColumn?.title).toBe('trace_id');
	});

	it('sets correct width for body column', () => {
		const selectedLogFields: IField[] = [
			{
				name: 'body',
				dataType: 'string',
				type: 'attribute',
			} as IField,
		];

		const columns = getLogPanelColumnsList(
			selectedLogFields,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys,
		);

		const bodyColumn = columns.find(
			(col) => 'dataIndex' in col && col.dataIndex === 'body',
		);
		expect(bodyColumn).toBeDefined();
		expect(bodyColumn?.width).toBe(350);
	});

	it('sets default width for non-body columns', () => {
		const selectedLogFields: IField[] = [
			{
				name: 'http.status_code',
				dataType: 'string',
				type: 'attribute',
			} as IField,
		];

		const columns = getLogPanelColumnsList(
			selectedLogFields,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys,
		);

		const statusCodeColumn = columns.find(
			(col) => 'dataIndex' in col && col.dataIndex === 'http.status_code',
		);
		expect(statusCodeColumn).toBeDefined();
		expect(statusCodeColumn?.width).toBe(100);
	});
});
