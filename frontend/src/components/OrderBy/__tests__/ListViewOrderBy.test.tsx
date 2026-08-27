import { fireEvent, render, screen, waitFor } from 'tests/test-utils';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { fetchFieldKeysForQuery } from 'api/querySuggestions/fieldSuggestions';
import { DataSource } from 'types/common/queryBuilder';

import ListViewOrderBy from '../ListViewOrderBy';

jest.mock('api/querySuggestions/fieldSuggestions', () => ({
	fetchFieldKeysForQuery: jest.fn(),
}));

const mockedFetchKeys = fetchFieldKeysForQuery as jest.MockedFunction<
	typeof fetchFieldKeysForQuery
>;

const mockKeys = (names: string[]): void => {
	mockedFetchKeys.mockResolvedValue({
		data: {
			data: {
				complete: true,
				keys: { traceKeys: names.map((name) => ({ name })) },
			},
		},
	});
};

const openDropdown = (): void => {
	fireEvent.mouseDown(screen.getByRole('combobox'));
};

// Scoped to the dropdown: the selected value renders the same label twice.
const getOptionLabels = (): string[] =>
	Array.from(document.querySelectorAll('.ant-select-item-option-content')).map(
		(node) => node.textContent ?? '',
	);

describe('ListViewOrderBy', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('reads the ai_observability trace context for an AI query', async () => {
		mockKeys(['total_tokens']);

		render(
			<ListViewOrderBy
				value="last_activity_time:desc"
				onChange={jest.fn()}
				dataSource={DataSource.TRACES}
				builderQueryType="builder_ai_query"
				fieldContext={TelemetrytypesFieldContextDTO.trace}
				staticOptionKeys={['last_activity_time']}
			/>,
		);

		await waitFor(() => {
			expect(mockedFetchKeys).toHaveBeenCalledWith({
				builderQueryType: 'builder_ai_query',
				dataSource: DataSource.TRACES,
				fieldContext: TelemetrytypesFieldContextDTO.trace,
				searchText: '',
			});
		});
	});

	it('offers the static keys alongside the ones the endpoint reports', async () => {
		mockKeys(['total_tokens']);

		render(
			<ListViewOrderBy
				value="last_activity_time:desc"
				onChange={jest.fn()}
				dataSource={DataSource.TRACES}
				builderQueryType="builder_ai_query"
				fieldContext={TelemetrytypesFieldContextDTO.trace}
				staticOptionKeys={['last_activity_time']}
			/>,
		);

		openDropdown();

		await waitFor(() => {
			expect(getOptionLabels()).toContain('total_tokens (desc)');
		});
		expect(getOptionLabels()).toContain('last_activity_time (asc)');
	});

	// The endpoint never reports a static key, so filtering would hide it for good.
	it('keeps a matching static key while searching', async () => {
		mockKeys([]);

		render(
			<ListViewOrderBy
				value="last_activity_time:desc"
				onChange={jest.fn()}
				dataSource={DataSource.TRACES}
				builderQueryType="builder_ai_query"
				fieldContext={TelemetrytypesFieldContextDTO.trace}
				staticOptionKeys={['last_activity_time']}
			/>,
		);

		openDropdown();
		fireEvent.change(screen.getByRole('combobox'), {
			target: { value: 'activity' },
		});

		await waitFor(() => {
			expect(getOptionLabels()).toContain('last_activity_time (desc)');
		});
	});

	it('defaults to timestamp and the generic endpoint', async () => {
		mockKeys(['service.name']);

		render(
			<ListViewOrderBy
				value="timestamp:desc"
				onChange={jest.fn()}
				dataSource={DataSource.TRACES}
			/>,
		);

		await waitFor(() => {
			expect(mockedFetchKeys).toHaveBeenCalledWith({
				builderQueryType: undefined,
				dataSource: DataSource.TRACES,
				fieldContext: undefined,
				searchText: '',
			});
		});

		openDropdown();

		await waitFor(() => {
			expect(getOptionLabels()).toContain('timestamp (desc)');
		});
	});
});
