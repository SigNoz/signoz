import { render, screen, within } from '@testing-library/react';

import AnnouncementsModal from '../AnnouncementsModal';

describe('AnnouncementsModal', () => {
	it('should render announcements modal with title', () => {
		render(<AnnouncementsModal />);

		expect(screen.getByText('Announcements')).toBeInTheDocument();
	});

	it('should have proper structure and classes', () => {
		render(<AnnouncementsModal />);

		const container = screen.getByTestId('announcements-modal');
		expect(container).toHaveClass('announcements-modal-container');

		const headerContainer = within(container).getByTestId(
			'announcements-modal-header',
		);
		expect(headerContainer).toHaveClass('announcements-modal-container-header');
		expect(headerContainer).toHaveTextContent('Announcements');
	});

	it('should render without any errors', () => {
		expect(() => render(<AnnouncementsModal />)).not.toThrow();
	});
});
