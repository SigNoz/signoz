import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { AppLink, type AppLinkProps } from '../AppLink';
import { useAppLocation } from '../useAppLocation';
import { useAppNavigationType } from '../useAppNavigationType';

function LocationProbe(): JSX.Element {
	const location = useAppLocation();
	const navigationType = useAppNavigationType();

	return (
		<div>
			<span data-testid="pathname">{location.pathname}</span>
			<span data-testid="search">{location.search}</span>
			<span data-testid="hash">{location.hash}</span>
			<span data-testid="state">{JSON.stringify(location.state ?? null)}</span>
			<span data-testid="action">{navigationType}</span>
		</div>
	);
}

function renderLink(props: AppLinkProps, children: ReactNode = 'go'): void {
	render(
		<MemoryRouter initialEntries={['/']}>
			<AppLink {...props}>{children}</AppLink>
			<LocationProbe />
		</MemoryRouter>,
	);
}

describe('AppLink', () => {
	it('renders an anchor with the resolved href', () => {
		renderLink({ to: '/logs?a=1', 'data-testid': 'link' } as AppLinkProps);

		expect(screen.getByTestId('link')).toHaveAttribute('href', '/logs?a=1');
	});

	it('resolves an object target', () => {
		renderLink({
			to: { pathname: '/logs', search: '?a=1' },
			'data-testid': 'link',
		} as AppLinkProps);

		expect(screen.getByTestId('link')).toHaveAttribute('href', '/logs?a=1');
	});

	it('forwards anchor attributes and children', () => {
		renderLink(
			{
				to: '/logs',
				className: 'nav-item',
				target: '_blank',
				title: 'Logs',
				'data-testid': 'link',
			} as AppLinkProps,
			<span data-testid="child">Logs</span>,
		);

		const link = screen.getByTestId('link');
		expect(link).toHaveClass('nav-item');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('title', 'Logs');
		expect(screen.getByTestId('child')).toBeInTheDocument();
	});

	it('navigates on click', () => {
		renderLink({ to: '/logs?a=1#top', 'data-testid': 'link' } as AppLinkProps);
		fireEvent.click(screen.getByTestId('link'));

		expect(screen.getByTestId('pathname')).toHaveTextContent('/logs');
		expect(screen.getByTestId('search')).toHaveTextContent('?a=1');
		expect(screen.getByTestId('hash')).toHaveTextContent('#top');
	});

	it('carries state without folding search and hash into the pathname', () => {
		renderLink({
			to: '/logs?a=1#top',
			state: { from: 'test' },
			'data-testid': 'link',
		} as AppLinkProps);
		fireEvent.click(screen.getByTestId('link'));

		expect(screen.getByTestId('pathname')).toHaveTextContent('/logs');
		expect(screen.getByTestId('search')).toHaveTextContent('?a=1');
		expect(screen.getByTestId('hash')).toHaveTextContent('#top');
		expect(screen.getByTestId('state')).toHaveTextContent('{"from":"test"}');
	});

	it('carries state on an object target', () => {
		renderLink({
			to: { pathname: '/logs' },
			state: { from: 'test' },
			'data-testid': 'link',
		} as AppLinkProps);
		fireEvent.click(screen.getByTestId('link'));

		expect(screen.getByTestId('state')).toHaveTextContent('{"from":"test"}');
	});

	it('pushes by default', () => {
		renderLink({ to: '/logs', 'data-testid': 'link' } as AppLinkProps);
		fireEvent.click(screen.getByTestId('link'));

		expect(screen.getByTestId('action')).toHaveTextContent('PUSH');
	});

	it('replaces the entry when replace is set', () => {
		renderLink({
			to: '/logs',
			replace: true,
			'data-testid': 'link',
		} as AppLinkProps);
		fireEvent.click(screen.getByTestId('link'));

		expect(screen.getByTestId('pathname')).toHaveTextContent('/logs');
		expect(screen.getByTestId('action')).toHaveTextContent('REPLACE');
	});
});
