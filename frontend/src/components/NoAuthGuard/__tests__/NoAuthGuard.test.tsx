import React from 'react';
import { render } from 'tests/test-utils';

import { NoAuthGuard } from '..';

describe('NoAuthGuard', () => {
	it('renders children unchanged when isNoAuthMode is false', () => {
		const { getByRole } = render(
			<NoAuthGuard>
				<button type="button">Action</button>
			</NoAuthGuard>,
			undefined,
			{ appContextOverrides: { isNoAuthMode: false } },
		);
		expect(getByRole('button', { name: 'Action' })).not.toBeDisabled();
	});

	it('does not intercept onClick when isNoAuthMode is false', () => {
		const handleClick = jest.fn();
		const { getByRole } = render(
			<NoAuthGuard>
				<button type="button" onClick={handleClick}>
					Action
				</button>
			</NoAuthGuard>,
			undefined,
			{ appContextOverrides: { isNoAuthMode: false } },
		);
		getByRole('button', { name: 'Action' }).click();
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it('disables children when isNoAuthMode is true', () => {
		const { getByRole } = render(
			<NoAuthGuard>
				<button type="button">Action</button>
			</NoAuthGuard>,
			undefined,
			{ appContextOverrides: { isNoAuthMode: true } },
		);
		expect(getByRole('button', { name: 'Action' })).toBeDisabled();
	});

	it('renders a tooltip trigger wrapper when isNoAuthMode is true', () => {
		const { container } = render(
			<NoAuthGuard>
				<button type="button">Action</button>
			</NoAuthGuard>,
			undefined,
			{ appContextOverrides: { isNoAuthMode: true } },
		);
		expect(
			container.querySelector('span[data-no-auth-trigger]'),
		).toBeInTheDocument();
	});

	it('blocks onClick when isNoAuthMode is true', () => {
		const handleClick = jest.fn();
		const { container } = render(
			<NoAuthGuard>
				<button type="button" onClick={handleClick}>
					Action
				</button>
			</NoAuthGuard>,
			undefined,
			{ appContextOverrides: { isNoAuthMode: true } },
		);
		container
			.querySelector('span[data-no-auth-trigger]')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(handleClick).not.toHaveBeenCalled();
	});

	it('overrides existing disabled prop — no-auth always wins', () => {
		const { getByRole } = render(
			<NoAuthGuard>
				<button type="button" disabled={false}>
					Action
				</button>
			</NoAuthGuard>,
			undefined,
			{ appContextOverrides: { isNoAuthMode: true } },
		);
		expect(getByRole('button', { name: 'Action' })).toBeDisabled();
	});

	it('sets pointerEvents none on child when isNoAuthMode is true', () => {
		const { getByRole } = render(
			<NoAuthGuard>
				<button type="button">Action</button>
			</NoAuthGuard>,
			undefined,
			{ appContextOverrides: { isNoAuthMode: true } },
		);
		expect(getByRole('button', { name: 'Action' })).toHaveStyle({
			pointerEvents: 'none',
		});
	});
});
