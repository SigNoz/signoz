import { act, fireEvent, render, screen } from '@testing-library/react';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	IntegrationType,
	RequestIntegrationBtn,
} from 'pages/Integrations/RequestIntegrationBtn';
import { I18nextProvider } from 'react-i18next';
import i18n from 'ReactI18';

describe('Request AWS integration', () => {
	it('should render the request integration button', async () => {
		let capturedPayload: any;
		server.use(
			rest.post('http://localhost/api/v1/event', async (req, res, ctx) => {
				capturedPayload = await req.json();
				return res(
					ctx.status(200),
					ctx.json({
						statusCode: 200,
						error: null,
						payload: 'Event Processed Successfully',
					}),
				);
			}),
		);
		act(() => {
			render(
				<I18nextProvider i18n={i18n}>
					<RequestIntegrationBtn type={IntegrationType.AWS_SERVICES} />{' '}
				</I18nextProvider>,
			);
		});

		expect(
			screen.getByText(
				/can't find what you’re looking for\? request more integrations/i,
			),
		).toBeInTheDocument();

		await act(() => {
			fireEvent.change(screen.getByPlaceholderText(/Enter integration name/i), {
				target: { value: 's3 sync' },
			});

			const submitButton = screen.getByRole('button', { name: /submit/i });

			expect(submitButton).toBeEnabled();

			fireEvent.click(submitButton);
		});

		expect(capturedPayload.eventName).toBeDefined();
		expect(capturedPayload.attributes).toBeDefined();

		expect(capturedPayload.eventName).toBe('AWS service integration requested');
		expect(capturedPayload.attributes).toEqual({
			screen: 'AWS integration details',
			integration: 's3 sync',
			deployment_url: 'localhost',
			user_email: null,
		});
	});
});
