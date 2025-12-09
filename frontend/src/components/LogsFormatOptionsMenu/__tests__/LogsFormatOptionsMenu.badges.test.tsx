import { TelemetryFieldKey } from 'api/v5/v5';
import {
	mockAllAvailableKeys,
	mockConflictingFieldsByContext,
	mockConflictingFieldsByDatatype,
} from 'container/OptionsMenu/__tests__/mockData';
import { FontSize } from 'container/OptionsMenu/types';
import { getOptionsFromKeys } from 'container/OptionsMenu/utils';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import LogsFormatOptionsMenu from '../LogsFormatOptionsMenu';

const mockUpdateFormatting = jest.fn();
const mockUpdateColumns = jest.fn();

jest.mock('providers/preferences/sync/usePreferenceSync', () => ({
	usePreferenceSync: (): any => ({
		preferences: {
			columns: [],
			formatting: {
				maxLines: 2,
				format: 'table',
				fontSize: 'small',
				version: 1,
			},
		},
		loading: false,
		error: null,
		updateColumns: mockUpdateColumns,
		updateFormatting: mockUpdateFormatting,
	}),
}));

describe('LogsFormatOptionsMenu - Badge Display', () => {
	const FORMAT_BUTTON_TEST_ID = 'periscope-btn-format-options';
	const HTTP_STATUS_CODE = 'http.status_code';

	beforeEach(() => {
		jest.clearAllMocks();
	});

	function setup(configOverrides = {}): any {
		const items = [
			{ key: 'raw', label: 'Raw', data: { title: 'max lines per row' } },
			{ key: 'list', label: 'Default' },
			{ key: 'table', label: 'Column', data: { title: 'columns' } },
		];

		const formatOnChange = jest.fn();
		const maxLinesOnChange = jest.fn();
		const fontSizeOnChange = jest.fn();
		const onSelect = jest.fn();
		const onRemove = jest.fn();
		const onSearch = jest.fn();
		const onFocus = jest.fn();
		const onBlur = jest.fn();

		const defaultConfig = {
			format: { value: 'table', onChange: formatOnChange },
			maxLines: { value: 2, onChange: maxLinesOnChange },
			fontSize: { value: FontSize.SMALL, onChange: fontSizeOnChange },
			addColumn: {
				isFetching: false,
				value: [],
				options: [],
				onFocus,
				onBlur,
				onSearch,
				onSelect,
				onRemove,
				allAvailableKeys: mockAllAvailableKeys,
				...configOverrides,
			},
		};

		const { getByTestId } = render(
			<LogsFormatOptionsMenu
				items={items}
				selectedOptionFormat="table"
				config={defaultConfig}
			/>,
		);

		return {
			getByTestId,
			formatOnChange,
			maxLinesOnChange,
			fontSizeOnChange,
			onSelect,
			onRemove,
			onSearch,
			onFocus,
			onBlur,
		};
	}

	it('shows badges in dropdown options when searching for conflicting attributes', () => {
		const options = getOptionsFromKeys(mockConflictingFieldsByDatatype, []);

		expect(options).toBeDefined();
		expect(options).toHaveLength(2);
		expect(options?.[0]?.hasMultipleVariants).toBe(true);
		expect(options?.[1]?.hasMultipleVariants).toBe(true);
		expect(options?.[0]?.fieldDataType).toBe('string');
		expect(options?.[1]?.fieldDataType).toBe('number');
	});

	it('shows badges in selected columns list after selecting conflicting attribute', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const selectedColumns: TelemetryFieldKey[] = [
			mockConflictingFieldsByDatatype[0], // Only string variant selected
		];

		const { getByTestId } = setup({
			value: selectedColumns,
		});

		// Open the popover menu
		const formatButton = getByTestId(FORMAT_BUTTON_TEST_ID);
		await user.click(formatButton);

		// Wait for selected columns section to appear
		await waitFor(() => {
			expect(screen.getByText(HTTP_STATUS_CODE)).toBeInTheDocument();
		});

		// Badge should appear even though only one variant is selected
		// because allAvailableKeys contains the conflicting variant
		const datatypeBadge = screen.queryByText('string');
		expect(datatypeBadge).toBeInTheDocument();
	});

	it('shows context badge only for attribute/resource conflicting fields', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const selectedColumns: TelemetryFieldKey[] = [
			mockConflictingFieldsByContext[0], // resource variant
		];

		const { getByTestId } = setup({
			value: selectedColumns,
		});

		// Open the popover menu
		const formatButton = getByTestId(FORMAT_BUTTON_TEST_ID);
		await user.click(formatButton);

		// Wait for selected columns section
		await waitFor(() => {
			expect(screen.getByText('service.name')).toBeInTheDocument();
		});

		// Context badge should appear for resource
		const contextBadge = screen.queryByText('resource');
		expect(contextBadge).toBeInTheDocument();
	});

	it('shows datatype badge for conflicting fields', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const selectedColumns: TelemetryFieldKey[] = [
			{
				name: HTTP_STATUS_CODE,
				fieldDataType: 'string',
				fieldContext: 'span', // span context
				signal: 'traces',
			},
		];

		const { getByTestId } = setup({
			value: selectedColumns,
			allAvailableKeys: [
				...mockAllAvailableKeys,
				{
					name: HTTP_STATUS_CODE,
					fieldDataType: 'number',
					fieldContext: 'span',
					signal: 'traces',
				},
			],
		});

		// Open the popover menu
		const formatButton = getByTestId(FORMAT_BUTTON_TEST_ID);
		await user.click(formatButton);

		// Wait for selected columns section
		await waitFor(() => {
			expect(screen.getByText(HTTP_STATUS_CODE)).toBeInTheDocument();
		});

		// Datatype badge should appear
		const datatypeBadge = screen.queryByText('string');
		expect(datatypeBadge).toBeInTheDocument();

		// Context badge should NOT appear for span context
		const contextBadge = screen.queryByText('span');
		expect(contextBadge).not.toBeInTheDocument();
	});
});
