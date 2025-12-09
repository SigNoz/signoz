import { render, renderHook, RenderHookResult } from '@testing-library/react';
import { ColumnType } from 'antd/es/table';
import { TelemetryFieldKey } from 'api/v5/v5';
import {
	mockAllAvailableKeys,
	mockConflictingFieldsByContext,
	mockConflictingFieldsByDatatype,
} from 'container/OptionsMenu/__tests__/mockData';
import { FontSize } from 'container/OptionsMenu/types';
import { ReactElement } from 'react';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

import { useTableView } from '../useTableView';

// Mock useTimezone hook
jest.mock('providers/Timezone', () => ({
	useTimezone: (): {
		formatTimezoneAdjustedTimestamp: (input: string | number) => string;
	} => ({
		formatTimezoneAdjustedTimestamp: jest.fn((input: string | number): string => {
			if (typeof input === 'string') {
				return new Date(input).toISOString();
			}
			return new Date(input / 1e6).toISOString();
		}),
	}),
}));

// Mock useIsDarkMode hook
jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

describe('useTableView - Column Headers', () => {
	const HTTP_STATUS_CODE = 'http.status_code';

	const mockLogs: ILog[] = [
		({
			id: '1',
			body: 'Test log',
			timestamp: '2024-01-01T00:00:00Z',
			[HTTP_STATUS_CODE]: '200',
		} as unknown) as ILog,
	];

	const renderUseTableView = (
		fields: TelemetryFieldKey[],
		allAvailableKeys = mockAllAvailableKeys,
	): RenderHookResult<ReturnType<typeof useTableView>, unknown> =>
		renderHook(() =>
			useTableView({
				logs: mockLogs,
				fields: fields as IField[],
				linesPerRow: 1,
				fontSize: FontSize.SMALL,
				allAvailableKeys,
			}),
		);

	it('shows datatype in column header for conflicting columns', () => {
		const fields: TelemetryFieldKey[] = [
			mockConflictingFieldsByDatatype[0], // string variant
		];

		const { result } = renderUseTableView(fields);
		const { columns } = result.current;

		const statusCodeColumn = columns.find(
			(col): col is ColumnType<Record<string, unknown>> =>
				'dataIndex' in col && col.dataIndex === HTTP_STATUS_CODE,
		);

		expect(statusCodeColumn).toBeDefined();
		expect(statusCodeColumn?.title).toBeDefined();

		const { container } = render(statusCodeColumn?.title as ReactElement);
		expect(container.textContent).toContain('Http.status_code'); // First letter is capitalized
		expect(container.textContent).toContain('string');
	});

	it('shows tooltip icon when unselected conflicting variant exists', () => {
		const fields: TelemetryFieldKey[] = [
			mockConflictingFieldsByDatatype[0], // Only string variant selected
		];

		const { result } = renderUseTableView(fields, mockAllAvailableKeys); // Contains number variant
		const { columns } = result.current;

		const statusCodeColumn = columns.find(
			(col): col is ColumnType<Record<string, unknown>> =>
				'dataIndex' in col && col.dataIndex === HTTP_STATUS_CODE,
		);

		expect(statusCodeColumn).toBeDefined();

		const { container } = render(statusCodeColumn?.title as ReactElement);
		const tooltipIcon = container.querySelector('.anticon-info-circle');
		expect(tooltipIcon).toBeInTheDocument();
	});

	it('hides tooltip icon when all conflicting variants are selected', () => {
		const fields: TelemetryFieldKey[] = [
			...mockConflictingFieldsByDatatype, // Both variants selected
		];

		const { result } = renderUseTableView(fields);
		const { columns } = result.current;

		const statusCodeColumn = columns.find(
			(col): col is ColumnType<Record<string, unknown>> =>
				'dataIndex' in col && col.dataIndex === HTTP_STATUS_CODE,
		);

		expect(statusCodeColumn).toBeDefined();

		const { container } = render(statusCodeColumn?.title as ReactElement);
		const tooltipIcon = container.querySelector('.anticon-info-circle');
		expect(tooltipIcon).not.toBeInTheDocument();
	});

	it('shows context in header for attribute/resource conflicting fields', () => {
		// When same datatype but different contexts, it shows context
		const fields: TelemetryFieldKey[] = [
			mockConflictingFieldsByContext[0], // resource variant
			mockConflictingFieldsByContext[1], // attribute variant - both have same datatype
		];

		const { result } = renderUseTableView(fields);
		const { columns } = result.current;

		const serviceNameColumn = columns.find(
			(col): col is ColumnType<Record<string, unknown>> =>
				'dataIndex' in col && col.dataIndex === 'service.name',
		);

		expect(serviceNameColumn).toBeDefined();

		const { container } = render(serviceNameColumn?.title as ReactElement);
		expect(container.textContent).toContain('Service.name'); // First letter is capitalized
		expect(container.textContent).toContain('resource');
	});
});
