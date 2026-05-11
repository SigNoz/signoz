import { render, screen, act } from '@testing-library/react';

import LastUpdatedText from './LastUpdatedText';

describe('LastUpdatedText', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('should return null when updatedAt is null', () => {
		const { container } = render(<LastUpdatedText updatedAt={null} />);

		expect(container.firstChild).toBeNull();
	});

	it('should render formatted time distance', () => {
		const now = Date.now();
		const fiveMinutesAgo = now - 5 * 60 * 1000;

		jest.setSystemTime(now);

		render(<LastUpdatedText updatedAt={fiveMinutesAgo} />);

		expect(screen.getByTestId('last-updated-text')).toHaveTextContent(
			/Updated.*5 minutes ago/,
		);
	});

	it('should have title with ISO formatted date', () => {
		const now = Date.now();
		const fiveMinutesAgo = now - 5 * 60 * 1000;

		jest.setSystemTime(now);

		render(<LastUpdatedText updatedAt={fiveMinutesAgo} />);

		expect(screen.getByTestId('last-updated-text').title).toMatch(
			/^\d{4}-\d{2}-\d{2}/,
		);
	});

	it('should update text periodically', () => {
		const now = Date.now();

		jest.setSystemTime(now);

		render(<LastUpdatedText updatedAt={now} />);

		expect(screen.getByTestId('last-updated-text')).toHaveTextContent(
			/Updated.*less than a minute ago/,
		);

		act(() => {
			jest.advanceTimersByTime(61000);
		});

		expect(screen.getByTestId('last-updated-text')).toHaveTextContent(
			/Updated.*1 minute ago/,
		);
	});

	it('should cleanup interval on unmount', () => {
		const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
		const now = Date.now();

		jest.setSystemTime(now);

		const { unmount } = render(<LastUpdatedText updatedAt={now} />);

		unmount();

		expect(clearIntervalSpy).toHaveBeenCalled();
		clearIntervalSpy.mockRestore();
	});

	it('should render with recent timestamp', () => {
		const now = Date.now();
		const tenSecondsAgo = now - 10 * 1000;

		jest.setSystemTime(now);

		render(<LastUpdatedText updatedAt={tenSecondsAgo} />);

		expect(screen.getByTestId('last-updated-text')).toHaveTextContent(
			/Updated.*less than a minute ago/,
		);
	});

	it('should render with hour-old timestamp', () => {
		const now = Date.now();
		const oneHourAgo = now - 60 * 60 * 1000;

		jest.setSystemTime(now);

		render(<LastUpdatedText updatedAt={oneHourAgo} />);

		expect(screen.getByTestId('last-updated-text')).toHaveTextContent(
			/Updated.*1 hour ago/,
		);
	});
});
