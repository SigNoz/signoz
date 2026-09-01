import { fireEvent, render, screen } from '@testing-library/react';

import SectionHeader from '../SectionHeader';

describe('SectionHeader', () => {
	it('renders a maximize toggle and calls the handler when clicked', () => {
		const onToggle = jest.fn();
		const onMaximizeToggle = jest.fn();

		render(
			<SectionHeader
				sectionId="section-1"
				title="Section title"
				open={true}
				onToggle={onToggle}
				onMaximizeToggle={onMaximizeToggle}
				isMaximized={false}
			/>,
		);

		const maximizeButton = screen.getByRole('button', {
			name: /maximize section/i,
		});
		expect(maximizeButton).toBeInTheDocument();

		fireEvent.click(maximizeButton);
		expect(onMaximizeToggle).toHaveBeenCalledTimes(1);
	});
});
