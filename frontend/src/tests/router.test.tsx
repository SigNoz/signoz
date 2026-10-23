import { render, screen } from '@testing-library/react';
import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';

import { TestRouter } from './router';
import { resetTestRoute } from './router-utils';

function Pathname(): JSX.Element {
	const { pathname } = useAppLocation();
	return <span data-testid="pathname">{pathname}</span>;
}

describe('TestRouter', () => {
	beforeEach(() => {
		resetTestRoute();
	});

	it('mounts at initialRoute', () => {
		render(
			<TestRouter initialRoute="/logs">
				<Pathname />
			</TestRouter>,
		);

		expect(screen.getByTestId('pathname')).toHaveTextContent('/logs');
	});

	it('keeps the existing URL when initialRoute is omitted', () => {
		navigate('/existing');

		render(
			<TestRouter>
				<Pathname />
			</TestRouter>,
		);

		expect(screen.getByTestId('pathname')).toHaveTextContent('/existing');
	});

	it('rejects an initialRoute on a nested TestRouter', () => {
		const consoleError = jest
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);

		expect(() =>
			render(
				<TestRouter initialRoute="/outer">
					<TestRouter initialRoute="/inner">
						<Pathname />
					</TestRouter>
				</TestRouter>,
			),
		).toThrow('A nested TestRouter cannot take initialRoute');

		consoleError.mockRestore();
	});

	it('keeps the outer route when the nested TestRouter has no initialRoute', () => {
		render(
			<TestRouter initialRoute="/outer">
				<TestRouter>
					<Pathname />
				</TestRouter>
			</TestRouter>,
		);

		expect(screen.getByTestId('pathname')).toHaveTextContent('/outer');
	});
});
