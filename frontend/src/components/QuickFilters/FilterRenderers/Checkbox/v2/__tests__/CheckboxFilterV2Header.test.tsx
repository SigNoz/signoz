import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CheckboxFilterV2Header } from '../CheckboxFilterV2Header';

describe('CheckboxFilterV2Header', () => {
	const defaultProps = {
		title: 'Environment',
		isOpen: false,
		showClearAll: true,
		isSomeFilterPresentForCurrentAttribute: true,
		onToggleOpen: jest.fn(),
		onClear: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('collapsed state', () => {
		it('renders title', () => {
			render(<CheckboxFilterV2Header {...defaultProps} isOpen={false} />);

			expect(screen.getByText('Environment')).toBeInTheDocument();
		});

		it('sets data-state="closed" when collapsed', () => {
			render(<CheckboxFilterV2Header {...defaultProps} isOpen={false} />);

			const header = screen.getByTestId('checkbox-filter-header');
			expect(header).toHaveAttribute('data-state', 'closed');
		});

		it('does not show clear button when collapsed', () => {
			render(
				<CheckboxFilterV2Header {...defaultProps} isOpen={false} showClearAll />,
			);

			expect(
				screen.queryByTestId('checkbox-filter-clear-all'),
			).not.toBeInTheDocument();
		});
	});

	describe('expanded state', () => {
		it('sets data-state="open" when expanded', () => {
			render(<CheckboxFilterV2Header {...defaultProps} isOpen />);

			const header = screen.getByTestId('checkbox-filter-header');
			expect(header).toHaveAttribute('data-state', 'open');
		});

		it('shows clear button when expanded + showClearAll=true', () => {
			render(<CheckboxFilterV2Header {...defaultProps} isOpen showClearAll />);

			expect(screen.getByTestId('checkbox-filter-clear-all')).toBeInTheDocument();
			expect(screen.getByText('Clear')).toBeInTheDocument();
		});

		it('hides clear button when showClearAll=false', () => {
			render(
				<CheckboxFilterV2Header {...defaultProps} isOpen showClearAll={false} />,
			);

			expect(
				screen.queryByTestId('checkbox-filter-clear-all'),
			).not.toBeInTheDocument();
		});

		it('hides clear button when no filter present for attribute', () => {
			render(
				<CheckboxFilterV2Header
					{...defaultProps}
					isOpen
					showClearAll
					isSomeFilterPresentForCurrentAttribute={false}
				/>,
			);

			expect(
				screen.queryByTestId('checkbox-filter-clear-all'),
			).not.toBeInTheDocument();
		});
	});

	describe('interactions', () => {
		it('calls onToggleOpen on header click', async () => {
			const user = userEvent.setup();
			const onToggleOpen = jest.fn();
			render(
				<CheckboxFilterV2Header {...defaultProps} onToggleOpen={onToggleOpen} />,
			);

			await user.click(screen.getByTestId('checkbox-filter-header'));

			expect(onToggleOpen).toHaveBeenCalledTimes(1);
		});

		it('calls onToggleOpen on Enter key', async () => {
			const user = userEvent.setup();
			const onToggleOpen = jest.fn();
			render(
				<CheckboxFilterV2Header {...defaultProps} onToggleOpen={onToggleOpen} />,
			);

			screen.getByTestId('checkbox-filter-header').focus();
			await user.keyboard('{Enter}');

			expect(onToggleOpen).toHaveBeenCalledTimes(1);
		});

		it('calls onToggleOpen on Space key', async () => {
			const user = userEvent.setup();
			const onToggleOpen = jest.fn();
			render(
				<CheckboxFilterV2Header {...defaultProps} onToggleOpen={onToggleOpen} />,
			);

			screen.getByTestId('checkbox-filter-header').focus();
			await user.keyboard(' ');

			expect(onToggleOpen).toHaveBeenCalledTimes(1);
		});

		it('calls onClear on clear button click', async () => {
			const user = userEvent.setup();
			const onClear = jest.fn();
			render(
				<CheckboxFilterV2Header {...defaultProps} isOpen onClear={onClear} />,
			);

			await user.click(screen.getByTestId('checkbox-filter-clear-all'));

			expect(onClear).toHaveBeenCalledTimes(1);
		});

		it('clear button click does not trigger onToggleOpen', async () => {
			const user = userEvent.setup();
			const onToggleOpen = jest.fn();
			const onClear = jest.fn();
			render(
				<CheckboxFilterV2Header
					{...defaultProps}
					isOpen
					onToggleOpen={onToggleOpen}
					onClear={onClear}
				/>,
			);

			await user.click(screen.getByTestId('checkbox-filter-clear-all'));

			expect(onClear).toHaveBeenCalledTimes(1);
			expect(onToggleOpen).not.toHaveBeenCalled();
		});
	});
});
