import { fireEvent, render, waitFor } from '@testing-library/react';

import TextToolTip from './index';

describe('TextToolTip', () => {
	const tooltipText = 'Tooltip Text';

	it('displays the tooltip when hovering over the icon', async () => {
		const { getByRole, getByText } = render(<TextToolTip text="Tooltip Text" />);
		const icon = getByRole('img');
		fireEvent.mouseOver(icon);

		await waitFor(() => {
			const tooltip = getByText(tooltipText);
			expect(tooltip).toBeInTheDocument();
		});
	});

	it('renders the tooltip content correctly', async () => {
		const { getByRole, getByText } = render(
			<TextToolTip text="Tooltip Text" url="https://example.com" />,
		);
		const icon = getByRole('img');
		fireEvent.mouseOver(icon);

		await waitFor(() => {
			const tooltip = getByText(tooltipText);
			const link = getByText('here');
			expect(tooltip).toBeInTheDocument();
			expect(link).toHaveAttribute('href', 'https://example.com');
			expect(link).toHaveAttribute('target', '_blank');
		});
	});

	it('does not display the tooltip by default', () => {
		const { queryByText } = render(<TextToolTip text="Tooltip Text" />);
		const tooltip = queryByText(tooltipText);
		expect(tooltip).toBeNull();
	});

	it('opens the URL in a new tab when clicked', async () => {
		const { getByRole } = render(
			<TextToolTip text="Tooltip Text" url="https://example.com" />,
		);
		const icon = getByRole('img');
		fireEvent.mouseOver(icon);
		await waitFor(() => {
			const link = getByRole('link');
			expect(link).toHaveAttribute('href', 'https://example.com');
			expect(link).toHaveAttribute('target', '_blank');
		});
	});
});
