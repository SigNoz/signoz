import { render } from '@testing-library/react';
import { TelemetryFieldKey } from 'api/v5/v5';
import {
	mockAllAvailableKeys,
	mockConflictingFieldsByContext,
	mockConflictingFieldsByDatatype,
	mockNonConflictingField,
} from 'container/OptionsMenu/__tests__/mockData';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import { ReactElement } from 'react';

import { getListColumns } from '../utils';

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

describe('getListColumns - Column Headers and Tooltips', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows datatype in column header for conflicting fields', () => {
		const selectedColumns: TelemetryFieldKey[] = [
			mockConflictingFieldsByDatatype[0], // string variant
		];

		const columns = getListColumns(
			selectedColumns,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys,
		);

		const statusCodeColumn = columns.find(
			// eslint-disable-next-line sonarjs/no-duplicate-string
			(col) => 'dataIndex' in col && col.dataIndex === 'http.status_code',
		);

		expect(statusCodeColumn).toBeDefined();
		expect(statusCodeColumn?.title).toBeDefined();

		const { container } = render(statusCodeColumn?.title as ReactElement);
		expect(container.textContent).toContain('Http.status_code'); // First letter is capitalized
		expect(container.textContent).toContain('string');
	});

	it('shows tooltip icon when unselected conflicting variant exists', () => {
		const selectedColumns: TelemetryFieldKey[] = [
			mockConflictingFieldsByDatatype[0], // Only string variant selected
		];

		const columns = getListColumns(
			selectedColumns,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys, // Contains number variant
		);

		const statusCodeColumn = columns.find(
			(col) => 'dataIndex' in col && col.dataIndex === 'http.status_code',
		);

		expect(statusCodeColumn).toBeDefined();

		const { container } = render(statusCodeColumn?.title as ReactElement);
		const tooltipIcon = container.querySelector('.anticon-info-circle');
		expect(tooltipIcon).toBeInTheDocument();
	});

	it('hides tooltip icon when all conflicting variants are selected', () => {
		const selectedColumns: TelemetryFieldKey[] = [
			...mockConflictingFieldsByDatatype, // Both variants selected
		];

		const columns = getListColumns(
			selectedColumns,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys,
		);

		const statusCodeColumn = columns.find(
			(col) => 'dataIndex' in col && col.dataIndex === 'http.status_code',
		);

		expect(statusCodeColumn).toBeDefined();

		const { container } = render(statusCodeColumn?.title as ReactElement);
		const tooltipIcon = container.querySelector('.anticon-info-circle');
		expect(tooltipIcon).not.toBeInTheDocument();
	});

	it('shows context in header for attribute/resource conflicting fields', () => {
		// When same datatype but different contexts, it shows context
		const selectedColumns: TelemetryFieldKey[] = [
			...mockConflictingFieldsByContext, // Both resource and attribute variants
		];

		const columns = getListColumns(
			selectedColumns,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys,
		);

		const serviceNameColumn = columns.find(
			(col) => 'dataIndex' in col && col.dataIndex === 'service.name',
		);

		expect(serviceNameColumn).toBeDefined();

		const { container } = render(serviceNameColumn?.title as ReactElement);
		expect(container.textContent).toContain('Service.name'); // First letter is capitalized
		expect(container.textContent).toContain('resource');
	});

	it('handles short column names correctly', () => {
		const selectedColumns: TelemetryFieldKey[] = [...mockNonConflictingField];

		const columns = getListColumns(
			selectedColumns,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys,
		);

		const traceIdColumn = columns.find(
			(col) => 'dataIndex' in col && col.dataIndex === 'trace_id',
		);

		expect(traceIdColumn).toBeDefined();
		expect(traceIdColumn?.title).toBe('Trace_id'); // Capitalized by getColumnTitle
	});

	it('handles long column names correctly', () => {
		const longNameField: TelemetryFieldKey[] = [
			{
				// eslint-disable-next-line sonarjs/no-duplicate-string
				name: 'very.long.column.name.that.might.truncate',
				fieldDataType: 'string',
				fieldContext: 'attribute',
				signal: 'traces',
			},
		];

		const columns = getListColumns(
			longNameField,
			mockFormatTimezoneAdjustedTimestamp,
			[
				...mockAllAvailableKeys,
				{
					name: 'very.long.column.name.that.might.truncate',
					fieldDataType: 'number',
					fieldContext: 'attribute',
					signal: 'traces',
				},
			],
		);

		const longColumn = columns.find(
			(col) =>
				'dataIndex' in col &&
				col.dataIndex === 'very.long.column.name.that.might.truncate',
		);

		expect(longColumn).toBeDefined();

		const { container } = render(longColumn?.title as ReactElement);
		expect(container.textContent).toContain(
			'Very.long.column.name.that.might.truncate',
		); // First letter is capitalized
		expect(container.textContent).toContain('string');
	});

	it('includes timestamp column in initial columns', () => {
		const columns = getListColumns(
			[],
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys,
		);

		const timestampColumn = columns.find(
			(col) => 'dataIndex' in col && col.dataIndex === 'date',
		);
		expect(timestampColumn).toBeDefined();
		expect(timestampColumn?.title).toBe('Timestamp');
	});
});
