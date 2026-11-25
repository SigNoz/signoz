import { render, screen, within } from 'tests/test-utils';
import { FontSize } from 'container/OptionsMenu/types';

import LogStateIndicator from './LogStateIndicator';

describe('LogStateIndicator', () => {
	it('renders correctly with default props', () => {
		render(<LogStateIndicator severityText="INFO" fontSize={FontSize.MEDIUM} />);
		const indicator = screen.getByTestId('log-state-indicator');
		expect(indicator).toHaveClass('log-state-indicator');
		expect(indicator).not.toHaveClass('isActive');
		expect(within(indicator).getByTestId('log-state-indicator-line')).toHaveClass(
			'severity-info-0',
		);
	});

	it('renders correctly with different types', () => {
		const { rerender } = render(
			<LogStateIndicator severityText="INFO" fontSize={FontSize.MEDIUM} />,
		);
		expect(screen.getByTestId('log-state-indicator-line')).toHaveClass(
			'severity-info-0',
		);

		rerender(
			<LogStateIndicator severityText="WARNING" fontSize={FontSize.MEDIUM} />,
		);
		expect(screen.getByTestId('log-state-indicator-line')).toHaveClass(
			'severity-warn-0',
		);

		rerender(
			<LogStateIndicator severityText="ERROR" fontSize={FontSize.MEDIUM} />,
		);
		expect(screen.getByTestId('log-state-indicator-line')).toHaveClass(
			'severity-error-0',
		);
	});
});
