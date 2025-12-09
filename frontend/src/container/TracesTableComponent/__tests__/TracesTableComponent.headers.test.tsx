import { render } from '@testing-library/react';
import { ColumnType } from 'antd/es/table';
import { TelemetryFieldKey } from 'api/v5/v5';
import {
	mockAllAvailableKeys,
	mockConflictingFieldsByContext,
	mockConflictingFieldsByDatatype,
} from 'container/OptionsMenu/__tests__/mockData';
import { getListColumns } from 'container/TracesExplorer/ListView/utils';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { ReactElement } from 'react';

const HTTP_STATUS_CODE = 'http.status_code';
const SERVICE_NAME = 'service.name';

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

describe('TracesTableComponent - Column Headers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows datatype in column header for conflicting columns', () => {
		const selectedTracesFields: TelemetryFieldKey[] = [
			mockConflictingFieldsByDatatype[0], // string variant
		];

		const columns = getListColumns(
			selectedTracesFields,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys,
		);

		// Find the http.status_code column
		const statusCodeColumn = columns.find(
			(col): col is ColumnType<RowData> =>
				'dataIndex' in col && (col.dataIndex as string) === HTTP_STATUS_CODE,
		);

		expect(statusCodeColumn).toBeDefined();
		expect(statusCodeColumn?.title).toBeDefined();

		// Title should be a ReactNode with datatype
		const { container } = render(statusCodeColumn?.title as ReactElement);
		expect(container.textContent).toContain('Http.status_code'); // First letter is capitalized
		expect(container.textContent).toContain('string');
	});

	it('shows tooltip icon when unselected conflicting variant exists', () => {
		const selectedTracesFields: TelemetryFieldKey[] = [
			mockConflictingFieldsByDatatype[0], // Only string variant selected
		];

		const columns = getListColumns(
			selectedTracesFields,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys, // Contains number variant
		);

		const statusCodeColumn = columns.find(
			(col): col is ColumnType<RowData> =>
				'dataIndex' in col && (col.dataIndex as string) === HTTP_STATUS_CODE,
		);

		expect(statusCodeColumn).toBeDefined();

		// Title should be a ReactNode with tooltip
		const { container } = render(statusCodeColumn?.title as ReactElement);

		// Check for tooltip icon (InfoCircleOutlined)
		const tooltipIcon = container.querySelector('.anticon-info-circle');
		expect(tooltipIcon).toBeInTheDocument();
	});

	it('hides tooltip icon when all conflicting variants are selected', () => {
		const selectedTracesFields: TelemetryFieldKey[] = [
			...mockConflictingFieldsByDatatype, // Both variants selected
		];

		const columns = getListColumns(
			selectedTracesFields,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys,
		);

		const statusCodeColumn = columns.find(
			(col): col is ColumnType<RowData> =>
				'dataIndex' in col && (col.dataIndex as string) === HTTP_STATUS_CODE,
		);

		expect(statusCodeColumn).toBeDefined();

		// Title should be a ReactNode but without tooltip icon
		const { container } = render(statusCodeColumn?.title as ReactElement);

		// Tooltip icon should NOT be present when all variants are selected
		const tooltipIcon = container.querySelector('.anticon-info-circle');
		expect(tooltipIcon).not.toBeInTheDocument();
	});

	it('shows context in header for attribute/resource conflicting fields', () => {
		// When same datatype but different contexts, it shows context
		const selectedTracesFields: TelemetryFieldKey[] = [
			...mockConflictingFieldsByContext, // Both resource and attribute variants
		];

		const columns = getListColumns(
			selectedTracesFields,
			mockFormatTimezoneAdjustedTimestamp,
			mockAllAvailableKeys,
		);

		const serviceNameColumn = columns.find(
			(col): col is ColumnType<RowData> =>
				'dataIndex' in col && (col.dataIndex as string) === SERVICE_NAME,
		);

		expect(serviceNameColumn).toBeDefined();

		// Title should include context when same datatype but different contexts
		const { container } = render(serviceNameColumn?.title as ReactElement);
		expect(container.textContent).toContain('Service.name'); // First letter is capitalized
		expect(container.textContent).toContain('resource');
	});
});
