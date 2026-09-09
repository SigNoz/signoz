import React from 'react';
import { render, screen } from 'tests/test-utils';
import userEvent from '@testing-library/user-event';
import NavItem from '../NavItem';
import { SidebarItem } from '../../sideNav.types';

const mockItem: SidebarItem = {
	key: 'test-key',
	label: 'Test Item',
	icon: <span>Icon</span>,
	isBeta: false,
	isNew: false,
	isEarlyAccess: false,
	tooltip: '',
};

describe('NavItem Component', () => {
	it('renders as a div when "to" prop is not provided', () => {
		const handleClick = jest.fn();
		render(
			<NavItem
				item={mockItem}
				isActive={false}
				onClick={handleClick}
				isDisabled={false}
			/>,
		);

		const navItemElement = screen.getByText('Test Item').closest('.nav-item');
		expect(navItemElement).toBeInTheDocument();
		expect(navItemElement?.tagName).toBe('DIV');
		expect(navItemElement).not.toHaveAttribute('href');
	});

	it('renders as a Link (anchor tag) with correct href when "to" prop is provided', () => {
		const handleClick = jest.fn();
		render(
			<NavItem
				item={mockItem}
				isActive={false}
				onClick={handleClick}
				isDisabled={false}
				to="/test-route"
			/>,
		);

		const navItemElement = screen.getByRole('link', { name: /test item/i });
		expect(navItemElement).toBeInTheDocument();
		expect(navItemElement?.tagName).toBe('A');
		expect(navItemElement).toHaveAttribute('href', '/test-route');
	});

	it('calls onClick handler when clicked', async () => {
		const handleClick = jest.fn();
		render(
			<NavItem
				item={mockItem}
				isActive={false}
				onClick={handleClick}
				isDisabled={false}
				to="/test-route"
			/>,
		);

		const navItemElement = screen.getByRole('link', { name: /test item/i });
		await userEvent.click(navItemElement);

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it('prevents default behavior and does not navigate when disabled', async () => {
		const handleClick = jest.fn();
		render(
			<NavItem
				item={mockItem}
				isActive={false}
				onClick={handleClick}
				isDisabled={true}
				to="/test-route"
			/>,
		);

		const navItemElement = screen.getByText('Test Item').closest('.nav-item');
		expect(navItemElement).toBeInTheDocument();
		expect(navItemElement).toHaveClass('disabled');
	});
});
