import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import ApdexSettings from '../components/ApdexSettings/ApdexSettings';

const APDEX = '*/api/v1/settings/apdex';

describe('ApdexSettings', () => {
	afterEach(() => server.resetHandlers());

	it('saves the edited threshold for the service', async () => {
		const saved = jest.fn();
		server.use(
			rest.get(APDEX, (_req, res, ctx) =>
				res(
					ctx.json({
						status: 'success',
						data: [{ servicename: 'cart', threshold: 0.5, excludeStatusCode: '' }],
					}),
				),
			),
			rest.post(APDEX, async (req, res, ctx) => {
				saved(await req.json());
				return res(ctx.json({ status: 'success', data: 'ok' }));
			}),
		);
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<ApdexSettings serviceName="cart" />);

		await user.click(screen.getByTestId('service-apdex-settings-trigger'));
		const input = await screen.findByTestId('service-apdex-threshold');
		await user.clear(input);
		await user.type(input, '1.2');
		await user.click(screen.getByTestId('service-apdex-save'));

		await waitFor(() =>
			expect(saved).toHaveBeenCalledWith({
				servicename: 'cart',
				threshold: 1.2,
				excludeStatusCode: '',
			}),
		);
	});
});
