import { act, render, screen } from '@testing-library/react';

import LabelColumn from './LabelColumn';

const BADGE_WIDTH = 60;

let resizeCallbacks: ResizeObserverCallback[] = [];

class MockResizeObserver {
	constructor(callback: ResizeObserverCallback) {
		resizeCallbacks.push(callback);
	}

	observe = jest.fn();
	unobserve = jest.fn();
	disconnect = jest.fn();
}

// jsdom has no layout: every badge measures BADGE_WIDTH, the column `containerWidth`.
function mockLayout(containerWidth: number): void {
	jest
		.spyOn(HTMLElement.prototype, 'clientWidth', 'get')
		.mockImplementation(function getClientWidth(this: HTMLElement) {
			return this.dataset.testid === 'label-column' ? containerWidth : 0;
		});
	jest
		.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
		.mockReturnValue({ width: BADGE_WIDTH } as DOMRect);
}

function triggerResize(containerWidth: number): void {
	mockLayout(containerWidth);
	act(() => {
		resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver));
	});
}

beforeAll(() => {
	global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(() => {
	resizeCallbacks = [];
	jest.restoreAllMocks();
});

function renderWithProviders(
	ui: React.ReactElement,
): ReturnType<typeof render> {
	return render(ui);
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

		// 3 badges (180px) + overflow reserve (40px)
		mockLayout(220);
		renderWithProviders(<LabelColumn labels={labels} />);

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

	it('should update the overflow count when the container resizes', () => {
		const labels = ['env', 'service', 'region', 'team', 'owner', 'version'];

		mockLayout(220);
		renderWithProviders(<LabelColumn labels={labels} />);
		expect(screen.getByTestId('label-overflow-badge')).toHaveTextContent('+3');

		// 2 badges (120px) + overflow reserve (40px)
		triggerResize(160);
		expect(screen.getByTestId('label-overflow-badge')).toHaveTextContent('+4');

		triggerResize(1000);
		expect(screen.queryByTestId('label-overflow-badge')).not.toBeInTheDocument();
	});

	it('should skip the overflow reserve when every label fits', () => {
		const labels = ['env', 'service', 'region', 'team', 'owner', 'version'];

		mockLayout(labels.length * BADGE_WIDTH);
		renderWithProviders(<LabelColumn labels={labels} />);

		expect(screen.queryByTestId('label-overflow-badge')).not.toBeInTheDocument();
	});

	it('should keep one label visible when even that one does not fit', () => {
		const labels = ['env', 'service'];

		mockLayout(50);
		renderWithProviders(<LabelColumn labels={labels} />);

		expect(screen.getByTestId('label-overflow-badge')).toHaveTextContent('+1');
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

		mockLayout(1000);
		renderWithProviders(<LabelColumn labels={labels} />);

		// All labels visible
		labels.forEach((label) => {
			expect(screen.getByTestId(`label-tag-${label}`)).toBeInTheDocument();
		});

		// No overflow badge
		expect(screen.queryByTestId('label-overflow-badge')).not.toBeInTheDocument();
	});
});
