import { render } from '@testing-library/react';
import { FontSize } from 'container/OptionsMenu/types';

import LogStateIndicator from './LogStateIndicator';

describe('LogStateIndicator', () => {
	it('renders correctly with default props', () => {
		const { container } = render(
			<LogStateIndicator severityText="INFO" fontSize={FontSize.MEDIUM} />,
		);
		const indicator = container.firstChild as HTMLElement;
		expect(indicator.classList.contains('log-state-indicator')).toBe(true);
		expect(indicator.classList.contains('isActive')).toBe(false);
		expect(container.querySelector('.line')).toBeTruthy();
		expect(
			container.querySelector('.line')?.classList.contains('severity-info-0'),
		).toBe(true);
	});

	it('renders correctly with different types', () => {
		const { container: containerInfo } = render(
			<LogStateIndicator severityText="INFO" fontSize={FontSize.MEDIUM} />,
		);
		expect(
			containerInfo.querySelector('.line')?.classList.contains('severity-info-0'),
		).toBe(true);

		const { container: containerWarning } = render(
			<LogStateIndicator severityText="WARNING" fontSize={FontSize.MEDIUM} />,
		);
		expect(
			containerWarning
				.querySelector('.line')
				?.classList.contains('severity-warn-0'),
		).toBe(true);

		const { container: containerError } = render(
			<LogStateIndicator severityText="ERROR" fontSize={FontSize.MEDIUM} />,
		);
		expect(
			containerError
				.querySelector('.line')
				?.classList.contains('severity-error-0'),
		).toBe(true);
	});
});
