import { useRef } from 'react';
import { act, render, screen, userEvent } from 'tests/test-utils';

import DotGrid from '../DotGrid';
import { useDotGrid } from '../useDotGrid';

const KONAMI =
	'{ArrowUp}{ArrowUp}{ArrowDown}{ArrowDown}{ArrowLeft}{ArrowRight}{ArrowLeft}{ArrowRight}ba';

function Chat({
	onGameChange,
}: {
	onGameChange: (isPlaying: boolean) => void;
}): JSX.Element {
	return (
		<div>
			<DotGrid onGameChange={onGameChange} />
			<textarea data-testid="chat-textarea" />
		</div>
	);
}

function ThemedGrid({ isDarkMode }: { isDarkMode: boolean }): JSX.Element {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const label = useDotGrid(canvasRef, isDarkMode);
	return (
		<>
			<canvas ref={canvasRef} />
			<span data-testid="score-line">{label}</span>
		</>
	);
}

describe('DotGrid Snake', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		// jsdom has no canvas or layout: a 9 × 7 game grid is enough for a snake.
		jest
			.spyOn(HTMLCanvasElement.prototype, 'getContext')
			.mockReturnValue(
				new Proxy({}, { get: () => jest.fn() }) as CanvasRenderingContext2D,
			);
		jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(120);
		jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(120);
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it('quits the game on Esc and hands the keyboard back', async () => {
		const user = userEvent.setup({
			advanceTimers: (ms) => jest.advanceTimersByTime(ms),
		});
		const onGameChange = jest.fn();
		render(<Chat onGameChange={onGameChange} />);

		await user.keyboard(KONAMI);
		expect(onGameChange).toHaveBeenLastCalledWith(true);
		expect(screen.getByTestId('ai-dot-grid')).toHaveTextContent(
			'Snake · score 0 · ↑ ↓ ← → · Esc to quit',
		);

		await user.keyboard('{Escape}');

		expect(onGameChange).toHaveBeenLastCalledWith(false);
		expect(screen.getByTestId('ai-dot-grid')).not.toHaveTextContent('Snake');
	});

	it('leaves arrows in the chat input alone after game over', async () => {
		const user = userEvent.setup({
			advanceTimers: (ms) => jest.advanceTimersByTime(ms),
		});
		const onGameChange = jest.fn();
		render(<Chat onGameChange={onGameChange} />);
		await user.keyboard(KONAMI);
		// Heading right, the snake reaches the wall within a few steps.
		act(() => {
			jest.advanceTimersByTime(1500);
		});
		expect(screen.getByTestId('ai-dot-grid')).toHaveTextContent('Game over');
		onGameChange.mockClear();

		await user.click(screen.getByTestId('chat-textarea'));
		await user.keyboard('{ArrowUp}');

		expect(onGameChange).not.toHaveBeenCalled();
	});

	it('drops the score line when the theme changes mid-game', async () => {
		const user = userEvent.setup({
			advanceTimers: (ms) => jest.advanceTimersByTime(ms),
		});
		const { rerender } = render(<ThemedGrid isDarkMode />);
		await user.keyboard(KONAMI);
		expect(screen.getByTestId('score-line')).toHaveTextContent('Snake · score 0');

		rerender(<ThemedGrid isDarkMode={false} />);

		expect(screen.getByTestId('score-line')).toBeEmptyDOMElement();
	});
});
