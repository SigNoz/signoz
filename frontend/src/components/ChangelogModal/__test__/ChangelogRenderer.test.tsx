/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { render, screen } from '@testing-library/react';
import {
	ChangelogSchema,
	DeploymentType,
} from 'types/api/changelog/getChangelogByVersion';

import ChangelogRenderer from '../components/ChangelogRenderer';

// Mock react-markdown to just render children as plain text
jest.mock(
	'react-markdown',
	() =>
		function ReactMarkdown({ children }: any) {
			return <div>{children}</div>;
		},
);

const mockChangelog: ChangelogSchema = {
	id: 1,
	documentId: 'doc-1',
	version: 'v1.0.0',
	createdAt: '2025-06-09T12:00:00Z',
	updatedAt: '2025-06-09T13:00:00Z',
	publishedAt: '2025-06-09T14:00:00Z',
	release_date: '2025-06-10',
	features: [
		{
			id: 1,
			title: 'Feature 1',
			description: 'Description for feature 1',
			media: {
				id: 1,
				documentId: 'doc1',
				ext: '.webp',
				url: '/uploads/feature1.webp',
				mime: 'image/webp',
				alternativeText: null,
			},
			documentId: 'feature-1',
			sort_order: 1,
			createdAt: '2025-06-09T12:00:00Z',
			updatedAt: '2025-06-09T13:00:00Z',
			publishedAt: '2025-06-09T14:00:00Z',
			deployment_type: DeploymentType.ALL,
		},
	],
	bug_fixes: 'Bug fix details',
	maintenance: 'Maintenance details',
};

describe('ChangelogRenderer', () => {
	it('renders release date', () => {
		render(<ChangelogRenderer changelog={mockChangelog} />);
		expect(screen.getByText('June 10, 2025')).toBeInTheDocument();
	});

	it('renders features, media, and description', () => {
		render(<ChangelogRenderer changelog={mockChangelog} />);
		expect(screen.getByText('Feature 1')).toBeInTheDocument();
		expect(screen.getByAltText('Media')).toBeInTheDocument();
		expect(screen.getByText('Description for feature 1')).toBeInTheDocument();
	});
});
