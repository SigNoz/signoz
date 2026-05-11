import { TooltipProvider } from '@signozhq/ui/tooltip';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LabelColumn from './LabelColumn';

function renderWithProviders(
	ui: React.ReactElement,
): ReturnType<typeof render> {
	return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe('LabelColumn', () => {
	it('should render all labels when 5 or fewer', () => {
		const labels = ['env', 'service', 'region'];

		renderWithProviders(<LabelColumn labels={labels} />);

		expect(screen.getByTestId('label-tag-env')).toBeInTheDocument();
		expect(screen.getByTestId('label-tag-service')).toBeInTheDocument();
		expect(screen.getByTestId('label-tag-region')).toBeInTheDocument();
	});

	it('should truncate labels and show +N badge when more than 5 labels', () => {
		const labels = ['env', 'service', 'region', 'team', 'owner', 'version'];

		renderWithProviders(<LabelColumn labels={labels} />);

		// First 3 visible
		expect(screen.getByTestId('label-tag-env')).toBeInTheDocument();
		expect(screen.getByTestId('label-tag-service')).toBeInTheDocument();
		expect(screen.getByTestId('label-tag-region')).toBeInTheDocument();

		// +3 badge for remaining
		expect(screen.getByTestId('label-overflow-badge')).toHaveTextContent('+3');
	});

	it('should render label with value when value prop provided', () => {
		const labels = ['env'];
		const value = { env: 'production' };

		renderWithProviders(<LabelColumn labels={labels} value={value} />);

		expect(screen.getByTestId('label-tag-env')).toHaveTextContent(
			'env: production',
		);
	});

	it('should render labels without value when value is not provided for that label', () => {
		const labels = ['env', 'service'];
		const value = { env: 'production' };

		renderWithProviders(<LabelColumn labels={labels} value={value} />);

		expect(screen.getByTestId('label-tag-env')).toHaveTextContent(
			'env: production',
		);
		expect(screen.getByTestId('label-tag-service')).toHaveTextContent('service');
	});

	it('should show popover with all labels when clicking +N badge', async () => {
		const user = userEvent.setup();
		const labels = ['env', 'service', 'region', 'team', 'owner', 'version'];

		renderWithProviders(<LabelColumn labels={labels} />);

		await user.click(screen.getByTestId('label-overflow-badge'));

		// All labels should appear in popover
		expect(screen.getByTestId('label-popover')).toBeInTheDocument();
		expect(screen.getByTestId('label-popover-item-env')).toBeInTheDocument();
		expect(screen.getByTestId('label-popover-item-version')).toBeInTheDocument();
	});

	it('should render empty when no labels provided', () => {
		renderWithProviders(<LabelColumn labels={[]} />);

		const column = screen.getByTestId('label-column');
		expect(column.children).toHaveLength(0);
	});

	it('should use primary color by default', () => {
		const labels = ['env'];

		renderWithProviders(<LabelColumn labels={labels} />);

		expect(screen.getByTestId('label-tag-env')).toBeInTheDocument();
	});
});
