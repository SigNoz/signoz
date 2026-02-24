import { render, screen } from '@testing-library/react';
import ROUTES from 'constants/routes';
import * as useGetTenantLicense from 'hooks/useGetTenantLicense';
import * as useSafeNavigate from 'hooks/useSafeNavigate';
import { userEvent } from 'tests/test-utils';

import AlertNotFound from '../AlertNotFound';

jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		push: jest.fn(),
	},
}));

import history from 'lib/history';

const mockSafeNavigate = jest.fn();
const useGetTenantLicenseSpy = jest.spyOn(
	useGetTenantLicense,
	'useGetTenantLicense',
);
const useSafeNavigateSpy = jest.spyOn(useSafeNavigate, 'useSafeNavigate');

describe('AlertNotFound', () => {
	beforeEach(() => {
		mockSafeNavigate.mockClear();
		window.open = jest.fn();
		useGetTenantLicenseSpy.mockReturnValue({
			isCloudUser: false,
		} as ReturnType<typeof useGetTenantLicense.useGetTenantLicense>);
		useSafeNavigateSpy.mockReturnValue({
			safeNavigate: mockSafeNavigate,
		});
	});

	it('should render the correct error message for test alerts', () => {
		render(<AlertNotFound isTestAlert />);
		expect(
			screen.getByText("Uh-oh! We couldn't find the given alert rule."),
		).toBeInTheDocument();
		expect(
			screen.getByText('This can happen in the following scenario -'),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				'You clicked on the Alert notification link received when testing a new Alert rule. Once the alert rule is saved, future notifications will link to actual alerts.',
			),
		).toBeInTheDocument();
	});

	it('should render the correct error message for non-existing alerts', () => {
		render(<AlertNotFound isTestAlert={false} />);
		expect(
			screen.getByText("Uh-oh! We couldn't find the given alert rule."),
		).toBeInTheDocument();
		expect(
			screen.getByText('This can happen in either of the following scenarios -'),
		).toBeInTheDocument();
		expect(
			screen.getByText('The alert rule link is incorrect, please verify it once.'),
		).toBeInTheDocument();
		expect(
			screen.getByText("The alert rule you're trying to check has been deleted."),
		).toBeInTheDocument();
	});

	it('should navigate to the list all alerts page when the check all rules button is clicked', async () => {
		const user = userEvent.setup();
		render(<AlertNotFound isTestAlert={false} />);
		await user.click(screen.getByText('Check all rules'));
		expect(mockSafeNavigate).toHaveBeenCalledWith(ROUTES.LIST_ALL_ALERT);
	});

	it('should navigate to the correct support page for cloud users when button is clicked', async () => {
		const user = userEvent.setup();
		useGetTenantLicenseSpy.mockReturnValueOnce({
			isCloudUser: true,
		} as ReturnType<typeof useGetTenantLicense.useGetTenantLicense>);

		render(<AlertNotFound isTestAlert={false} />);
		await user.click(screen.getByText('Contact Support'));
		expect(history.push).toHaveBeenCalledWith('/support');
	});

	it('should navigate to the support page for self-hosted users when the contact support button is clicked', async () => {
		const user = userEvent.setup();
		render(<AlertNotFound isTestAlert={false} />);
		await user.click(screen.getByText('Contact Support'));
		expect(window.open).toHaveBeenCalledWith('https://signoz.io/slack', '_blank');
	});
});
