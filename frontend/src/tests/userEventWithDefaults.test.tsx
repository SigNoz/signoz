import { render, screen, userEvent } from 'tests/test-utils';

describe('userEvent from the harness', () => {
	const onClick = jest.fn() as jest.MockedFunction<
		React.MouseEventHandler<HTMLButtonElement>
	>;

	const renderBlockedButton = (): void => {
		render(
			<button
				type="button"
				data-testid="blocked"
				style={{ pointerEvents: 'none' }}
				onClick={onClick}
			>
				Blocked
			</button>,
		);
	};

	it('skips the pointer-events check for setup()', async () => {
		renderBlockedButton();

		await userEvent.setup().click(screen.getByTestId('blocked'));

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('skips the pointer-events check for the direct API', async () => {
		renderBlockedButton();

		await userEvent.click(screen.getByTestId('blocked'));

		expect(onClick).toHaveBeenCalledTimes(1);
	});
});
