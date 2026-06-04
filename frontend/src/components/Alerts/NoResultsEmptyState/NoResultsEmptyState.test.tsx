import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NoResultsEmptyState from './NoResultsEmptyState';

describe('NoResultsEmptyState', () => {
	it('should render with default props', () => {
		render(<NoResultsEmptyState />);

		expect(screen.getByTestId('no-results-empty-state')).toBeInTheDocument();
		expect(screen.getByTestId('no-results-title')).toHaveTextContent(
			'No matching results',
		);
		expect(screen.getByTestId('no-results-subtitle')).toHaveTextContent(
			'No items match your current filters. Try adjusting your search criteria.',
		);
	});

	it('should render with custom title and subtitle', () => {
		render(
			<NoResultsEmptyState title="Custom Title" subtitle="Custom Subtitle" />,
		);

		expect(screen.getByTestId('no-results-title')).toHaveTextContent(
			'Custom Title',
		);
		expect(screen.getByTestId('no-results-subtitle')).toHaveTextContent(
			'Custom Subtitle',
		);
	});

	it('should not render clear button when onClear is not provided', () => {
		render(<NoResultsEmptyState />);

		expect(
			screen.queryByTestId('no-results-clear-button'),
		).not.toBeInTheDocument();
	});

	it('should render clear button when onClear is provided', () => {
		const onClear = jest.fn();

		render(<NoResultsEmptyState onClear={onClear} />);

		expect(screen.getByTestId('no-results-clear-button')).toBeInTheDocument();
		expect(screen.getByTestId('no-results-clear-button')).toHaveTextContent(
			'Clear Filters',
		);
	});

	it('should render custom clear button text', () => {
		render(
			<NoResultsEmptyState onClear={jest.fn()} clearButtonText="Reset All" />,
		);

		expect(screen.getByTestId('no-results-clear-button')).toHaveTextContent(
			'Reset All',
		);
	});

	it('should call onClear when clear button is clicked', async () => {
		const user = userEvent.setup();
		const onClear = jest.fn();

		render(<NoResultsEmptyState onClear={onClear} />);

		await user.click(screen.getByTestId('no-results-clear-button'));

		expect(onClear).toHaveBeenCalledTimes(1);
	});
});
