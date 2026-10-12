import { Color } from '@signozhq/design-tokens';
import { render as rtlRender, screen } from '@testing-library/react';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import userEvent from '@testing-library/user-event';

import AppearanceSection from '../AppearanceSection';

// Color swatches use a radix tooltip, which needs a TooltipProvider ancestor.
const render = (ui: JSX.Element): ReturnType<typeof rtlRender> =>
	rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

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
				value={{ showRank: false, showShare: false, barColor: '#4E74F8' }}
				controls={{ showRank: true, showShare: true }}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId(testId));

		expect(onChange).toHaveBeenCalledWith({
			showRank: false,
			showShare: false,
			barColor: '#4E74F8',
			[field]: true,
		});
	});

	it('picks a bar color, keeping the other fields', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<AppearanceSection
				value={{ showRank: true, barColor: '#4E74F8' }}
				controls={{ barColor: true }}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('panel-editor-v2-bar-color-forest'));

		expect(onChange).toHaveBeenCalledWith({
			showRank: true,
			barColor: Color.BG_FOREST_500,
		});
	});

	it('shows the default bar color when the spec has none', () => {
		render(
			<AppearanceSection
				value={undefined}
				controls={{ barColor: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-bar-color-robin').querySelector('input'),
		).toBeChecked();
	});
});
