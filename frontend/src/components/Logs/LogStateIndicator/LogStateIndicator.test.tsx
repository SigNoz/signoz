import { render } from '@testing-library/react';

import LogStateIndicator from './LogStateIndicator';

describe('LogStateIndicator', () => {
	it('renders correctly with default props', () => {
		const { container } = render(<LogStateIndicator type="INFO" />);
		const indicator = container.firstChild as HTMLElement;
		expect(indicator.classList.contains('log-state-indicator')).toBe(true);
		expect(indicator.classList.contains('isActive')).toBe(false);
		expect(container.querySelector('.line')).toBeTruthy();
		expect(container.querySelector('.line')?.classList.contains('INFO')).toBe(
			true,
		);
	});

	it('renders correctly when isActive is true', () => {
		const { container } = render(<LogStateIndicator type="INFO" isActive />);
		const indicator = container.firstChild as HTMLElement;
		expect(indicator.classList.contains('isActive')).toBe(true);
	});

	it('renders correctly with different types', () => {
		const { container: containerInfo } = render(
			<LogStateIndicator type="INFO" />,
		);
		expect(containerInfo.querySelector('.line')?.classList.contains('INFO')).toBe(
			true,
		);

		const { container: containerWarning } = render(
			<LogStateIndicator type="WARNING" />,
		);
		expect(
			containerWarning.querySelector('.line')?.classList.contains('WARNING'),
		).toBe(true);

		const { container: containerError } = render(
			<LogStateIndicator type="ERROR" />,
		);
		expect(
			containerError.querySelector('.line')?.classList.contains('ERROR'),
		).toBe(true);
	});
});
