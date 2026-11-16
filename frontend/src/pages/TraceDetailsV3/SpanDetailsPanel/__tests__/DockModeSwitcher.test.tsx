import { render, screen, userEvent } from 'tests/test-utils';

import { SpanDetailVariant } from '../constants';
import DockModeSwitcher from '../DockModeSwitcher';

describe('DockModeSwitcher', () => {
	it.each([
		[SpanDetailVariant.DIALOG, SpanDetailVariant.DOCKED],
		[SpanDetailVariant.DOCKED, SpanDetailVariant.DIALOG],
		[SpanDetailVariant.DOCKED_RIGHT, SpanDetailVariant.DIALOG],
	])(
		'calls onChange with %s when its item is clicked',
		async (target, current) => {
			const onChange = jest.fn();
			render(<DockModeSwitcher value={current} onChange={onChange} />);

			await userEvent.click(screen.getByTestId(`dock-mode-${target}`));

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith(target);
		},
	);

	it('marks the current mode pressed and ignores a click on it', async () => {
		const onChange = jest.fn();
		render(
			<DockModeSwitcher
				value={SpanDetailVariant.DOCKED_RIGHT}
				onChange={onChange}
			/>,
		);

		const current = screen.getByTestId(
			`dock-mode-${SpanDetailVariant.DOCKED_RIGHT}`,
		);
		expect(current).toHaveAttribute('aria-pressed', 'true');

		await userEvent.click(current);

		expect(onChange).not.toHaveBeenCalled();
	});
});
