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
	// antd's virtual list only renders the first couple of options into jsdom, so
	// each case asserts on what the restriction admits and excludes rather than on
	// the whole option list.
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

	it('offers only the sources the caller can visualize', async () => {
		render(
			<DataSourceDropdown
				data-testid={TEST_ID}
				value={DataSource.METRICS}
				supportedDataSources={[DataSource.METRICS]}
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

	it('lets an explicit list win over the list-panel default', async () => {
		render(
			<DataSourceDropdown
				data-testid={TEST_ID}
				value={DataSource.METRICS}
				supportedDataSources={[DataSource.METRICS]}
				isListViewPanel
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
	});

	it('falls back to the explorer sources for a list panel', async () => {
		render(
			<DataSourceDropdown
				data-testid={TEST_ID}
				value={DataSource.LOGS}
				isListViewPanel
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
