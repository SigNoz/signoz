import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import NavItem from '../NavItem';

const baseItem = {
	key: '/services',
	label: 'Services',
	icon: <span />,
};

describe('NavItem', () => {
	it('renders navigable items as links', () => {
		render(
			<MemoryRouter>
				<NavItem
					item={baseItem}
					isActive={false}
					isDisabled={false}
					showIcon
					href="/services?foo=bar"
					onClick={jest.fn()}
				/>
			</MemoryRouter>,
		);

		expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute(
			'href',
			'/services?foo=bar',
		);
	});

	it('keeps non-navigable items as non-link controls', () => {
		const onClick = jest.fn();

		render(
			<MemoryRouter>
				<NavItem
					item={{ ...baseItem, key: 'quick-search', label: 'Quick Search' }}
					isActive={false}
					isDisabled={false}
					dataTestId="quick-search-nav-item"
					onClick={onClick}
				/>
			</MemoryRouter>,
		);

		expect(screen.queryByRole('link', { name: 'Quick Search' })).not.toBeInTheDocument();
		expect(screen.getByTestId('quick-search-nav-item')).toBeInTheDocument();
	});
});
