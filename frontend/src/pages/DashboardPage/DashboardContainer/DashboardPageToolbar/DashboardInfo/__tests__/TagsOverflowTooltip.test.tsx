import { render, screen } from '@testing-library/react';

import TagsOverflowTooltip from '../TagsOverflowTooltip';

describe('TagsOverflowTooltip', () => {
	it('renders every hidden tag as its own chip', () => {
		render(
			<TagsOverflowTooltip tags={['production', 'team-checkout', 'tier-1']} />,
		);

		const chips = screen
			.getByTestId('dashboard-tags-tooltip')
			.querySelectorAll('[data-slot="badge"]');

		expect(Array.from(chips).map((chip) => chip.textContent)).toStrictEqual([
			'production',
			'team-checkout',
			'tier-1',
		]);
	});
});
