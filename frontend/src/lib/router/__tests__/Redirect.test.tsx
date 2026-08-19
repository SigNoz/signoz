import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import { Redirect, type RedirectProps } from '../Redirect';
import { useAppLocation } from '../useAppLocation';
import { useAppNavigationType } from '../useAppNavigationType';

function LocationProbe(): JSX.Element {
	const location = useAppLocation();
	const navigationType = useAppNavigationType();

	return (
		<div>
			<span data-testid="pathname">{location.pathname}</span>
			<span data-testid="search">{location.search}</span>
			<span data-testid="state">{JSON.stringify(location.state ?? null)}</span>
			<span data-testid="action">{navigationType}</span>
		</div>
	);
}

function renderRedirect(props: RedirectProps): void {
	render(
		<MemoryRouter initialEntries={['/']}>
			<Redirect {...props} />
			<LocationProbe />
		</MemoryRouter>,
	);
}

describe('Redirect', () => {
	it('navigates to the target', () => {
		renderRedirect({ to: '/logs?a=1' });

		expect(screen.getByTestId('pathname')).toHaveTextContent('/logs');
		expect(screen.getByTestId('search')).toHaveTextContent('?a=1');
	});

	it('replaces by default, so Back does not re-run the redirect', () => {
		renderRedirect({ to: '/logs' });

		expect(screen.getByTestId('action')).toHaveTextContent('REPLACE');
	});

	it('pushes when replace is false', () => {
		renderRedirect({ to: '/logs', replace: false });

		expect(screen.getByTestId('action')).toHaveTextContent('PUSH');
	});

	it('resolves an object target', () => {
		renderRedirect({ to: { pathname: '/logs', search: '?a=1' } });

		expect(screen.getByTestId('pathname')).toHaveTextContent('/logs');
		expect(screen.getByTestId('search')).toHaveTextContent('?a=1');
	});

	it('carries state without folding search into the pathname', () => {
		renderRedirect({ to: '/logs?a=1', state: { from: 'test' } });

		expect(screen.getByTestId('pathname')).toHaveTextContent('/logs');
		expect(screen.getByTestId('search')).toHaveTextContent('?a=1');
		expect(screen.getByTestId('state')).toHaveTextContent('{"from":"test"}');
	});
});
