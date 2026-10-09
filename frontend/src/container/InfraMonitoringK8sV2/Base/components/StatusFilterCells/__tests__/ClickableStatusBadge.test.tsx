import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NuqsTestingAdapter, UrlUpdateEvent } from 'nuqs/adapters/testing';

import ClickableStatusBadge from '../ClickableStatusBadge';

function renderBadge(
	searchParams: Record<string, string>,
	onUrlUpdate: jest.Mock<void, [UrlUpdateEvent]>,
): void {
	render(
		<NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
			<ClickableStatusBadge
				color="cherry"
				label="CrashLoopBackOff"
				status="crashloopbackoff"
				kind="pod"
				rowId="row-1"
			/>
		</NuqsTestingAdapter>,
	);
}

describe('ClickableStatusBadge', () => {
	const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();

	beforeEach(() => {
		onUrlUpdate.mockClear();
	});

	it('filters by its status when nothing is filtered', async () => {
		renderBadge({}, onUrlUpdate);

		await userEvent.click(screen.getByTestId('status-badge-crashloopbackoff'));

		await waitFor(() => {
			expect(onUrlUpdate.mock.calls[0][0].searchParams.get('podStatus')).toBe(
				'crashloopbackoff',
			);
		});
	});

	it('clears the filter when its status is the whole filter', async () => {
		renderBadge({ podStatus: 'crashloopbackoff' }, onUrlUpdate);

		await userEvent.click(screen.getByTestId('status-badge-crashloopbackoff'));

		await waitFor(() => {
			expect(
				onUrlUpdate.mock.calls[0][0].searchParams.get('podStatus'),
			).toBeNull();
		});
	});

	it('still filters when its status is only part of the filter', async () => {
		// Clearing here would silently drop oomkilled, which the user also picked.
		renderBadge({ podStatus: 'crashloopbackoff,oomkilled' }, onUrlUpdate);

		await userEvent.click(screen.getByTestId('status-badge-crashloopbackoff'));

		await waitFor(() => {
			expect(onUrlUpdate.mock.calls[0][0].searchParams.get('podStatus')).toBe(
				'crashloopbackoff',
			);
		});
	});
});
