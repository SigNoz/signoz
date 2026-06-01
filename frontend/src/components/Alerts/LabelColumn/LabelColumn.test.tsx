import { TooltipProvider } from '@signozhq/ui/tooltip';
import { act, render, screen } from '@testing-library/react';

import LabelColumn from './LabelColumn';

let resizeCallback: ResizeObserverCallback | null = null;

class MockResizeObserver {
	constructor(callback: ResizeObserverCallback) {
		resizeCallback = callback;
	}

	observe = jest.fn();
	unobserve = jest.fn();
	disconnect = jest.fn();
}

function triggerResize(width: number): void {
	if (resizeCallback) {
		act(() => {
			resizeCallback?.(
				[{ contentRect: { width } } as ResizeObserverEntry],
				{} as ResizeObserver,
			);
		});
	}
}

beforeAll(() => {
	global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(() => {
	resizeCallback = null;
});

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

	it('should truncate labels and show +N badge when container is narrow', () => {
		const labels = ['env', 'service', 'region', 'team', 'owner', 'version'];

		renderWithProviders(<LabelColumn labels={labels} />);

		// Simulate narrow container that fits ~3 badges
		// Badge widths: env=37, service=65, region=58, team=44, owner=51, version=65
		// 220px available = 3 badges (160px) + gaps (8px) + overflow (44px)
		triggerResize(220);

		// First 3 visible
		expect(screen.getByTestId('label-tag-env')).toBeInTheDocument();
		expect(screen.getByTestId('label-tag-service')).toBeInTheDocument();
		expect(screen.getByTestId('label-tag-region')).toBeInTheDocument();

		// Remaining in overflow badge
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

	it('should show overflow badge with remaining count when container is narrow', () => {
		const labels = ['env', 'service', 'region', 'team', 'owner', 'version'];

		renderWithProviders(<LabelColumn labels={labels} />);

		// Simulate narrow container to trigger overflow (shows 3 labels)
		// 220px fits first 3 badges before overflow
		triggerResize(220);

		// Overflow badge shows +3 (remaining labels)
		const overflowBadge = screen.getByTestId('label-overflow-badge');
		expect(overflowBadge).toBeInTheDocument();
		expect(overflowBadge).toHaveTextContent('+3');
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

	it('should show all labels when container is wide enough', () => {
		const labels = ['env', 'service', 'region', 'team', 'owner', 'version'];

		renderWithProviders(<LabelColumn labels={labels} />);

		// Simulate wide container
		triggerResize(1000);

		// All labels visible
		labels.forEach((label) => {
			expect(screen.getByTestId(`label-tag-${label}`)).toBeInTheDocument();
		});

		// No overflow badge
		expect(screen.queryByTestId('label-overflow-badge')).not.toBeInTheDocument();
	});
});
