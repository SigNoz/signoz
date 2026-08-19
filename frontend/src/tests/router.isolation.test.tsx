import { render, screen } from '@testing-library/react';
import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';

import { TestRouter } from './router';

function Pathname(): JSX.Element {
	const { pathname } = useAppLocation();
	return <span data-testid="pathname">{pathname}</span>;
}

describe('TestRouter isolation', () => {
	it('lets a test navigate away from the start', () => {
		render(
			<TestRouter>
				<Pathname />
			</TestRouter>,
		);
		navigate('/logs');

		expect(window.location.pathname).toBe('/logs');
	});

	it('starts the next test at /', () => {
		render(
			<TestRouter>
				<Pathname />
			</TestRouter>,
		);

		expect(screen.getByTestId('pathname')).toHaveTextContent('/');
		expect(window.location.pathname).toBe('/');
	});
});
