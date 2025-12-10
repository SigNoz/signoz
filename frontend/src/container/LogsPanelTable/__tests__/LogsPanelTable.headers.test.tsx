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
});
