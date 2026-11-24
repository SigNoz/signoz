import { render, screen, within } from 'tests/test-utils';

import TagsOverflowTooltip from '../TagsOverflowTooltip';

describe('TagsOverflowTooltip', () => {
	it('renders every hidden tag as its own chip', () => {
		render(
			<TagsOverflowTooltip tags={['production', 'team-checkout', 'tier-1']} />,
		);

		const chips = within(
			screen.getByTestId('dashboard-tags-tooltip'),
		).getAllByTestId('dashboard-tags-tooltip-tag');

		expect(chips.map((chip) => chip.textContent)).toStrictEqual([
			'production',
			'team-checkout',
			'tier-1',
		]);
	});
});
