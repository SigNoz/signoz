import { TelemetryFieldKey } from 'api/v5/v5';
import {
	mockAllAvailableKeys,
	mockConflictingFieldsByContext,
	mockConflictingFieldsByDatatype,
} from 'container/OptionsMenu/__tests__/mockData';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import { renderColumnHeader } from 'tests/columnHeaderHelpers';

import { getListColumns } from '../utils';

const COLUMN_UNDEFINED_ERROR = 'statusCodeColumn is undefined';
const SERVICE_NAME_COLUMN_UNDEFINED_ERROR = 'serviceNameColumn is undefined';

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

		if (!statusCodeColumn) {
			throw new Error(COLUMN_UNDEFINED_ERROR);
		}

		const { container } = renderColumnHeader(statusCodeColumn);
		expect(container.textContent).toContain('http.status_code (string)');
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

		if (!serviceNameColumn) {
			throw new Error(SERVICE_NAME_COLUMN_UNDEFINED_ERROR);
		}

		const { container } = renderColumnHeader(serviceNameColumn);
		expect(container.textContent).toContain('service.name (resource)');
		expect(container.textContent).toContain('resource');
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
