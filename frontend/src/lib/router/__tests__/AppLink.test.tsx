import { createRef } from 'react';
import type { ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from 'tests/test-utils';

import { AppLink, type AppLinkProps } from '../AppLink';
import { useAppLocation } from '../useAppLocation';

function LocationProbe(): JSX.Element {
	const location = useAppLocation();
	const history = useHistory();

	return (
		<div>
			<span data-testid="pathname">{location.pathname}</span>
			<span data-testid="search">{location.search}</span>
			<span data-testid="hash">{location.hash}</span>
			<span data-testid="state">{JSON.stringify(location.state ?? null)}</span>
			<span data-testid="length">{history.length}</span>
		</div>
	);
}

function renderLink(
	props: AppLinkProps,
	children: ReactNode = 'go',
	initialEntry = '/',
): void {
	render(
		<>
			<AppLink {...props}>{children}</AppLink>
			<LocationProbe />
		</>,
		undefined,
		{ initialRoute: initialEntry },
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

	it('keeps the current pathname for a search-only string with state', () => {
		renderLink(
			{ to: '?tab=2', state: { a: 1 }, 'data-testid': 'link' } as AppLinkProps,
			'go',
			'/x/y?q=1',
		);

		expect(screen.getByTestId('link')).toHaveAttribute('href', '/x/y?tab=2');
		fireEvent.click(screen.getByTestId('link'));

		expect(screen.getByTestId('pathname')).toHaveTextContent('/x/y');
		expect(screen.getByTestId('search')).toHaveTextContent('?tab=2');
		expect(screen.getByTestId('state')).toHaveTextContent('{"a":1}');
	});

	it('keeps the current pathname for a hash-only string with state', () => {
		renderLink(
			{ to: '#h', state: { a: 1 }, 'data-testid': 'link' } as AppLinkProps,
			'go',
			'/x/y?q=1',
		);

		expect(screen.getByTestId('link')).toHaveAttribute('href', '/x/y#h');
	});

	it('decodes a string target with state once, as without state', () => {
		renderLink({ to: '/a%2520b', 'data-testid': 'link' } as AppLinkProps);
		fireEvent.click(screen.getByTestId('link'));
		const withoutState = screen.getByTestId('pathname').textContent;
		cleanup();

		renderLink({
			to: '/a%2520b',
			state: { a: 1 },
			'data-testid': 'link',
		} as AppLinkProps);
		fireEvent.click(screen.getByTestId('link'));

		expect(screen.getByTestId('pathname').textContent).toBe(withoutState);
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

	it('replaces the entry when replace is set', () => {
		renderLink({
			to: '/logs',
			replace: true,
			'data-testid': 'link',
		} as AppLinkProps);
		const before = screen.getByTestId('length').textContent;
		fireEvent.click(screen.getByTestId('link'));

		expect(screen.getByTestId('pathname')).toHaveTextContent('/logs');
		expect(screen.getByTestId('length').textContent).toBe(before);
	});

	it('forwards a ref to the anchor', () => {
		const ref = createRef<HTMLAnchorElement>();
		render(
			<AppLink ref={ref} to="/logs">
				go
			</AppLink>,
		);

		expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
	});
});
