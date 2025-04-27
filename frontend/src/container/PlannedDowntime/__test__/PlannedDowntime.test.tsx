import { screen } from '@testing-library/react';
import { render } from 'tests/test-utils';
import { USER_ROLES } from 'types/roles';

import { PlannedDowntime } from '../PlannedDowntime';

describe('PlannedDowntime Component', () => {
	it('renders the PlannedDowntime component properly', () => {
		render(<PlannedDowntime />, {}, 'ADMIN');

		// Check if title is rendered
		expect(screen.getByText('Planned Downtime')).toBeInTheDocument();

		// Check if subtitle is rendered
		expect(
			screen.getByText('Create and manage planned downtimes.'),
		).toBeInTheDocument();

		// Check if search input is rendered
		expect(
			screen.getByPlaceholderText('Search for a planned downtime...'),
		).toBeInTheDocument();

		// Check if "New downtime" button is enabled for ADMIN
		const newDowntimeButton = screen.getByRole('button', {
			name: /new downtime/i,
		});
		expect(newDowntimeButton).toBeInTheDocument();
		expect(newDowntimeButton).not.toBeDisabled();
	});

	it('disables the "New downtime" button for users with VIEWER role', () => {
		render(<PlannedDowntime />, {}, USER_ROLES.VIEWER);

		// Check if "New downtime" button is disabled for VIEWER
		const newDowntimeButton = screen.getByRole('button', {
			name: /new downtime/i,
		});
		expect(newDowntimeButton).toBeInTheDocument();
		expect(newDowntimeButton).toBeDisabled();

		expect(newDowntimeButton).toHaveAttribute('disabled');
	});
});
