import { render, screen } from '@testing-library/react';

import getLocal from '../../../api/browser/localstorage/get';
import AppLoading from '../AppLoading';

jest.mock('../../../api/browser/localstorage/get', () => ({
	__esModule: true,
	default: jest.fn(),
}));

// Access the mocked function
const mockGet = (getLocal as unknown) as jest.Mock;

describe('AppLoading', () => {
	const SIGNOZ_TEXT = 'SigNoz';
	const TAGLINE_TEXT =
		'OpenTelemetry-Native Logs, Metrics and Traces in a single pane';
	const CONTAINER_SELECTOR = '.app-loading-container';

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should render loading screen with dark theme by default', () => {
		// Mock localStorage to return dark theme (or undefined for default)
		mockGet.mockReturnValue(undefined);

		render(<AppLoading />);

		// Check if main elements are rendered
		expect(screen.getByAltText(SIGNOZ_TEXT)).toBeInTheDocument();
		expect(screen.getByText(SIGNOZ_TEXT)).toBeInTheDocument();
		expect(screen.getByText(TAGLINE_TEXT)).toBeInTheDocument();

		// Check if dark theme class is applied
		const container = screen.getByText(SIGNOZ_TEXT).closest(CONTAINER_SELECTOR);
		expect(container).toHaveClass('dark');
		expect(container).not.toHaveClass('lightMode');
	});

	it('should have proper structure and content', () => {
		// Mock localStorage to return dark theme
		mockGet.mockReturnValue(undefined);

		render(<AppLoading />);

		// Check for brand logo
		const logo = screen.getByAltText(SIGNOZ_TEXT);
		expect(logo).toBeInTheDocument();
		expect(logo).toHaveAttribute('src', '/Logos/signoz-brand-logo.svg');

		// Check for brand title
		const title = screen.getByText(SIGNOZ_TEXT);
		expect(title).toBeInTheDocument();

		// Check for tagline
		const tagline = screen.getByText(TAGLINE_TEXT);
		expect(tagline).toBeInTheDocument();

		// Check for loader
		const loader = document.querySelector('.loader');
		expect(loader).toBeInTheDocument();
	});

	it('should handle localStorage errors gracefully', () => {
		// Mock localStorage to throw an error
		mockGet.mockImplementation(() => {
			throw new Error('localStorage not available');
		});

		render(<AppLoading />);

		// Should still render with dark theme as fallback
		expect(screen.getByText(SIGNOZ_TEXT)).toBeInTheDocument();
		const container = screen.getByText(SIGNOZ_TEXT).closest(CONTAINER_SELECTOR);
		expect(container).toHaveClass('dark');
	});
});
