import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AppearanceSection from '../AppearanceSection';

describe('AppearanceSection', () => {
	it('renders only the controls whose flag is set', () => {
		render(
			<AppearanceSection
				value={undefined}
				controls={{ showRank: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-show-rank')).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-show-share'),
		).not.toBeInTheDocument();
	});

	it.each([
		{ testId: 'panel-editor-v2-show-rank', field: 'showRank' },
		{ testId: 'panel-editor-v2-show-share', field: 'showShare' },
	])('toggles $field through onChange', async ({ testId, field }) => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<AppearanceSection
				value={{ showRank: false, showShare: false }}
				controls={{ showRank: true, showShare: true }}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId(testId));

		expect(onChange).toHaveBeenCalledWith({
			showRank: false,
			showShare: false,
			[field]: true,
		});
	});
});
