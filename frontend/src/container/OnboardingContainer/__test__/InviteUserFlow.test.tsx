/* eslint-disable sonarjs/no-identical-functions */
import { queryByAttribute, waitFor } from '@testing-library/react';
import { fireEvent, render, screen, within } from 'tests/test-utils';

import OnboardingContainer from '..';
import { OnboardingContextProvider } from '../context/OnboardingContext';

jest.mock('react-markdown', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());

const successNotification = jest.fn();
jest.mock('hooks/useNotifications', () => ({
	__esModule: true,
	useNotifications: jest.fn(() => ({
		notifications: {
			success: successNotification,
			error: jest.fn(),
		},
	})),
}));

window.analytics = {
	track: jest.fn(),
};

describe('Onboarding invite team member flow', () => {
	it('initial render and get started page', async () => {
		const { findByText } = render(
			<OnboardingContextProvider>
				<OnboardingContainer />
			</OnboardingContextProvider>,
		);

		await expect(findByText('SigNoz')).resolves.toBeInTheDocument();

		// Check all the option present
		const monitoringTexts = [
			{
				title: 'Application Monitoring',
				description:
					'Monitor application metrics like p99 latency, error rates, external API calls, and db calls.',
			},
			{
				title: 'Logs Management',
				description:
					'Easily filter and query logs, build dashboards and alerts based on attributes in logs',
			},
			{
				title: 'Infrastructure Monitoring',
				description:
					'Monitor Kubernetes infrastructure metrics, hostmetrics, or metrics of any third-party integration',
			},
			{
				title: 'AWS Monitoring',
				description:
					'Monitor your traces, logs and metrics for AWS services like EC2, ECS, EKS etc.',
			},
			{
				title: 'Azure Monitoring',
				description:
					'Monitor your traces, logs and metrics for Azure services like AKS, Container Apps, App Service etc.',
			},
		];

		monitoringTexts.forEach(async ({ title, description }) => {
			await expect(findByText(title)).resolves.toBeInTheDocument();
			await expect(findByText(description)).resolves.toBeInTheDocument();
		});

		// Invite team member button
		await expect(findByText('invite')).resolves.toBeInTheDocument();
	});

	it('invite team member', async () => {
		const { findByText } = render(
			<OnboardingContextProvider>
				<OnboardingContainer />
			</OnboardingContextProvider>,
		);

		// Invite team member button
		const inviteBtn = await findByText('invite');
		expect(inviteBtn).toBeInTheDocument();

		fireEvent.click(inviteBtn);
		const inviteModal = await screen.findByTestId('invite-team-members-modal');
		expect(inviteModal).toBeInTheDocument();

		const inviteModalTitle = await within(inviteModal).findAllByText(
			/invite_team_members/i,
		);
		expect(inviteModalTitle[0]).toBeInTheDocument();

		// Verify that the invite modal contains an input field for entering the email address
		const emailInput = within(inviteModal).getByText('email_address');
		expect(emailInput).toBeInTheDocument();

		// Verify that the invite modal contains a dropdown for selecting the role
		const role = within(inviteModal).getByText('role');
		expect(role).toBeInTheDocument();

		// Verify that the invite modal contains a button for sending the invitation
		const sendButton = within(inviteModal).getByTestId(
			'invite-team-members-button',
		);
		expect(sendButton).toBeInTheDocument();

		// Verify that the invite modal sends the invitation
		fireEvent.input(queryByAttribute('id', inviteModal, 'members_0_email')!, {
			target: { value: 'test@example.com' },
		});
		expect(
			queryByAttribute('value', inviteModal, 'test@example.com'),
		).toBeInTheDocument();

		const roleDropdown = within(inviteModal).getByTestId('role-select');
		expect(roleDropdown).toBeInTheDocument();

		fireEvent.click(sendButton);

		await waitFor(() =>
			expect(successNotification).toHaveBeenCalledWith({
				message: 'Invite sent successfully',
			}),
		);
	});
});
