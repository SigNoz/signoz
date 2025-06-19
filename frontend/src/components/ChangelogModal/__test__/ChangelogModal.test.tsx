/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { fireEvent, render, screen } from '@testing-library/react';

import ChangelogModal from '../ChangelogModal';

const mockChangelog = {
	release_date: '2025-06-10',
	features: [
		{
			id: 1,
			title: 'Feature 1',
			description: 'Description for feature 1',
			media: null,
		},
	],
	bug_fixes: 'Bug fix details',
	maintenance: 'Maintenance details',
};

// Mock react-markdown to just render children as plain text
jest.mock(
	'react-markdown',
	() =>
		function ReactMarkdown({ children }: any) {
			return <div>{children}</div>;
		},
);

// mock useAppContext
jest.mock('providers/App/App', () => ({
	useAppContext: jest.fn(() => ({ changelog: mockChangelog })),
}));

describe('ChangelogModal', () => {
	it('renders modal with changelog data', () => {
		render(<ChangelogModal onClose={jest.fn()} />);
		expect(
			screen.getByText('What’s New ⎯ Changelog : June 10, 2025'),
		).toBeInTheDocument();
		expect(screen.getByText('Feature 1')).toBeInTheDocument();
		expect(screen.getByText('Description for feature 1')).toBeInTheDocument();
		expect(screen.getByText('Bug fix details')).toBeInTheDocument();
		expect(screen.getByText('Maintenance details')).toBeInTheDocument();
	});

	it('calls onClose when Skip for now is clicked', () => {
		const onClose = jest.fn();
		render(<ChangelogModal onClose={onClose} />);
		fireEvent.click(screen.getByText('Skip for now'));
		expect(onClose).toHaveBeenCalled();
	});

	it('opens migration docs when Update my workspace is clicked', () => {
		window.open = jest.fn();
		render(<ChangelogModal onClose={jest.fn()} />);
		fireEvent.click(screen.getByText('Update my workspace'));
		expect(window.open).toHaveBeenCalledWith(
			'https://github.com/SigNoz/signoz/releases',
			'_blank',
			'noopener,noreferrer',
		);
	});

	it('scrolls for more when Scroll for more is clicked', () => {
		render(<ChangelogModal onClose={jest.fn()} />);
		const scrollBtn = screen.getByTestId('scroll-more-btn');
		const contentDiv = screen.getByTestId('changelog-content');
		if (contentDiv) {
			contentDiv.scrollTo = jest.fn();
		}
		fireEvent.click(scrollBtn);
		if (contentDiv) {
			expect(contentDiv.scrollTo).toHaveBeenCalled();
		}
	});
});
