import { render, screen } from 'tests/test-utils';

import MultiIngestionSettings from '../MultiIngestionSettings';

describe('MultiIngestionSettings Page', () => {
	beforeEach(() => {
		render(<MultiIngestionSettings />);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders MultiIngestionSettings page without crashing', () => {
		expect(
			screen.getByText(
				'Find your ingestion URL and learn more about sending data to SigNoz',
			),
		).toBeInTheDocument();

		expect(screen.getByText('Ingestion Keys')).toBeInTheDocument();

		expect(
			screen.getByText('Create and manage ingestion keys for the SigNoz Cloud'),
		).toBeInTheDocument();

		const overviewLink = screen.getByRole('link', { name: /here/i });
		expect(overviewLink).toHaveAttribute(
			'href',
			'https://signoz.io/docs/ingestion/signoz-cloud/overview/',
		);
		expect(overviewLink).toHaveAttribute('target', '_blank');
		expect(overviewLink).toHaveClass('learn-more');
		expect(overviewLink).toHaveAttribute('rel', 'noreferrer');

		const aboutKeyslink = screen.getByRole('link', { name: /Learn more/i });
		expect(aboutKeyslink).toHaveAttribute(
			'href',
			'https://signoz.io/docs/ingestion/signoz-cloud/keys/',
		);
		expect(aboutKeyslink).toHaveAttribute('target', '_blank');
		expect(aboutKeyslink).toHaveClass('learn-more');
		expect(aboutKeyslink).toHaveAttribute('rel', 'noreferrer');
	});
});
