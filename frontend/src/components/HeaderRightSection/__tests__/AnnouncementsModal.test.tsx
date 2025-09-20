import { render, screen } from '@testing-library/react';

import AnnouncementsModal from '../AnnouncementsModal';

describe('AnnouncementsModal', () => {
	it('should render announcements modal with title', () => {
		render(<AnnouncementsModal />);

		expect(screen.getByText('Announcements')).toBeInTheDocument();
	});

	it('should have proper structure and classes', () => {
		render(<AnnouncementsModal />);

		const container = screen
			.getByText('Announcements')
			.closest('.announcements-modal-container');
		expect(container).toBeInTheDocument();

		const headerContainer = screen
			.getByText('Announcements')
			.closest('.announcements-modal-container-header');
		expect(headerContainer).toBeInTheDocument();
	});

	it('should render without any errors', () => {
		expect(() => render(<AnnouncementsModal />)).not.toThrow();
	});
});
