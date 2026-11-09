import { render, screen, userEvent } from 'tests/test-utils';
import { ILog } from 'types/api/logs/log';

import LogsList from '..';

jest.mock('components/LogDetail', () => ({
	__esModule: true,
	default: ({ log }: { log: ILog | null }): JSX.Element | null =>
		log ? <div data-testid="log-detail-stub">{log.id}</div> : null,
}));

const logs = [
	{ id: 'log-1', timestamp: '2024-01-15T09:45:30Z', body: 'first body' },
	{ id: 'log-2', timestamp: '2024-01-15T09:46:30Z', body: 'second body' },
] as unknown as ILog[];

describe('Pipeline preview LogsList', () => {
	it('opens the log details when the expand control is clicked', async () => {
		const user = userEvent.setup();

		render(<LogsList logs={logs} />);

		await user.click(screen.getAllByTestId('pipeline-preview-log-expand')[1]);

		expect(screen.getByTestId('log-detail-stub')).toHaveTextContent('log-2');
	});

	it('opens the log details from the keyboard with Enter', async () => {
		const user = userEvent.setup();

		render(<LogsList logs={logs} />);

		screen.getAllByTestId('pipeline-preview-log-expand')[0].focus();
		await user.keyboard('{Enter}');

		expect(screen.getByTestId('log-detail-stub')).toHaveTextContent('log-1');
	});

	it('does not reopen the log details on the keyup of another key', async () => {
		const user = userEvent.setup();

		render(<LogsList logs={logs} />);

		screen.getAllByTestId('pipeline-preview-log-expand')[0].focus();
		await user.keyboard('{Escape}');

		expect(screen.queryByTestId('log-detail-stub')).not.toBeInTheDocument();
	});
});
