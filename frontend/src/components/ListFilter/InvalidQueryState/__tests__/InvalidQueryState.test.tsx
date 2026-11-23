import { handleContactSupport } from 'container/Integrations/utils';
import { render, screen, userEvent } from 'tests/test-utils';

import InvalidQueryState from '../InvalidQueryState';

jest.mock('container/Integrations/utils', () => ({
	handleContactSupport: jest.fn(),
}));

describe('InvalidQueryState', () => {
	it('shows the backend message without its prefix and with quoted hints', () => {
		render(
			<InvalidQueryState
				errorMessage="invalid filter query: unknown field `nme`"
				isCloudUser={false}
				testIdPrefix="list"
			/>,
		);

		expect(screen.getByTestId('list-invalid-query-title')).toHaveTextContent(
			'Invalid query',
		);
		expect(screen.getByTestId('list-invalid-query-detail')).toHaveTextContent(
			/^unknown field "nme"$/,
		);
	});

	it('falls back to a syntax hint without a message', () => {
		render(<InvalidQueryState isCloudUser={false} testIdPrefix="list" />);

		expect(screen.getByTestId('list-invalid-query-detail')).toHaveTextContent(
			'Please review the syntax and try again.',
		);
	});

	it('runs the callback, then opens support', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onContactSupport = jest.fn();
		render(
			<InvalidQueryState
				errorMessage="bad"
				isCloudUser
				testIdPrefix="list"
				onContactSupport={onContactSupport}
			/>,
		);

		await user.click(screen.getByTestId('list-contact-support'));

		expect(onContactSupport).toHaveBeenCalledTimes(1);
		expect(jest.mocked(handleContactSupport)).toHaveBeenCalledWith(true);
	});
});
