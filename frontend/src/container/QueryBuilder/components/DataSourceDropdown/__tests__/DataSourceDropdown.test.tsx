import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent } from 'tests/test-utils';
import { DataSource } from 'types/common/queryBuilder';

import { DataSourceDropdown } from '../DataSourceDropdown';

const TEST_ID = 'query-data-source-selector';

async function openDropdown(): Promise<void> {
	const user = userEvent.setup();
	const trigger = screen.getByTestId(TEST_ID);
	await user.click(trigger.querySelector('.ant-select-selector') as HTMLElement);
}

describe('DataSourceDropdown', () => {
	// antd's virtual list renders only the first couple of options into jsdom, so
	// each case asserts what the restriction admits and excludes, not the full list.
	it('offers the signals beyond the current one when nothing restricts it', async () => {
		render(
			<DataSourceDropdown
				data-testid={TEST_ID}
				value={DataSource.METRICS}
				onChange={jest.fn()}
			/>,
		);
		await openDropdown();

		await expect(
			screen.findByRole('option', { name: 'Logs' }),
		).resolves.toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Metrics' })).toBeInTheDocument();
	});

	it('offers only the signals the caller can visualize', async () => {
		render(
			<DataSourceDropdown
				data-testid={TEST_ID}
				value={DataSource.METRICS}
				allowedDataSources={[TelemetrytypesSignalDTO.metrics]}
				onChange={jest.fn()}
			/>,
		);
		await openDropdown();

		await expect(
			screen.findByRole('option', { name: 'Metrics' }),
		).resolves.toBeInTheDocument();
		expect(
			screen.queryByRole('option', { name: 'Logs' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('option', { name: 'Traces' }),
		).not.toBeInTheDocument();
	});

	it('drops a signal that is not a data source a query can be built against', async () => {
		render(
			<DataSourceDropdown
				data-testid={TEST_ID}
				value={DataSource.LOGS}
				allowedDataSources={[
					TelemetrytypesSignalDTO.logs,
					TelemetrytypesSignalDTO.traces,
					TelemetrytypesSignalDTO[''],
				]}
				onChange={jest.fn()}
			/>,
		);
		await openDropdown();

		await expect(
			screen.findByRole('option', { name: 'Logs' }),
		).resolves.toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Traces' })).toBeInTheDocument();
		expect(
			screen.queryByRole('option', { name: 'Metrics' }),
		).not.toBeInTheDocument();
	});
});
