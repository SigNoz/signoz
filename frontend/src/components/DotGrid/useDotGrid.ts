import type { RefObject } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
	DOT_RADIUS,
	DOT_SPACING,
	STILL_TIME_MS,
	TRAIL_LIFE_MS,
	TRAIL_MAX_POINTS,
	TRAIL_MIN_STEP,
	TRAIL_RADIUS,
} from './dotGridField';
import type { TrailPoint } from './drawDots';
import { drawAuroraDots, drawDot, gameFloor } from './drawDots';
import type { SnakeGame } from './snakeGame';
import {
	KONAMI_CODE,
	SNAKE_DIRECTIONS,
	SNAKE_STEP_MS,
	startSnake,
	stepSnake,
} from './snakeGame';
import { getSnakeColors } from './dotGridTheme';

const GAME_OVER_LABEL_MS = 4000;
const REPLAY_LABEL = '↑ to replay';
const playingLabel = (score: number): string =>
	`Snake · score ${score} · ↑ ↓ ← → · Esc to quit`;

// Unlocked once per page load; after that a click on the dots starts a game.
let isSnakeUnlocked = false;
// Room left under the snake's lowest row for the score line, so the two never touch.
const SCORE_LINE_CLEARANCE = 30;

const isField = (target: EventTarget | null): target is HTMLElement =>
	target instanceof HTMLElement &&
	Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));

/** Draws the aurora dot grid; the Konami code turns it into Snake. Returns the score line. */
export function useDotGrid(
	canvasRef: RefObject<HTMLCanvasElement>,
	isDarkMode: boolean,
	onGameChange?: (isPlaying: boolean) => void,
): string | null {
	const [label, setLabel] = useState<string | null>(null);
	const onGameChangeRef = useRef(onGameChange);
	useLayoutEffect(() => {
		onGameChangeRef.current = onGameChange;
	});

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext('2d');
		if (!canvas || !ctx) {
			return undefined;
		}
		const isStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const snakeColors = getSnakeColors(canvas, isDarkMode);

		let width = 0;
		let height = 0;
		let cols = 0;
		let rows = 0;
		let gameRows = 0;
		let left = 0;
		let dots: { x: number; y: number }[] = [];
		const trail: TrailPoint[] = [];
		let frame = 0;
		let game: SnakeGame | null = null;
		let lastStep = 0;
		// With reduced motion the field stands still, so frames repaint only after a change.
		let needsDraw = true;
		let isScoreLineShown = false;
		const showScoreLine = (text: string | null): void => {
			isScoreLineShown = text !== null;
			needsDraw = true;
			setLabel(text);
		};
		const recentKeys: string[] = [];
		let labelTimer = 0;
		// An arrow key replays while the game over line is up.
		let canReplay = false;
		const showPlayCursor = (): void => {
			canvas.style.cursor = isSnakeUnlocked && !game ? 'pointer' : '';
		};

		const cellCenter = (c: number, r: number): { x: number; y: number } => ({
			x: left + c * DOT_SPACING,
			y: DOT_SPACING + r * DOT_SPACING,
		});

		const play = (): void => {
			game = startSnake(cols, gameRows);
			lastStep = performance.now();
			canReplay = false;
			window.clearTimeout(labelTimer);
			showScoreLine(game ? playingLabel(0) : null);
			showPlayCursor();
			onGameChangeRef.current?.(game !== null);
		};
		const quit = (): void => {
			game = null;
			canReplay = false;
			window.clearTimeout(labelTimer);
			showScoreLine(null);
			showPlayCursor();
			onGameChangeRef.current?.(false);
		};
		const endGame = (score: number): void => {
			game = null;
			canReplay = true;
			showScoreLine(`Game over · score ${score} · ${REPLAY_LABEL}`);
			showPlayCursor();
			onGameChangeRef.current?.(false);
			labelTimer = window.setTimeout(() => {
				canReplay = false;
				showScoreLine(null);
			}, GAME_OVER_LABEL_MS);
		};

		const layout = (): void => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			width = canvas.clientWidth;
			height = canvas.clientHeight;
			canvas.width = Math.floor(width * dpr);
			canvas.height = Math.floor(height * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			cols = Math.max(0, Math.floor((width - DOT_SPACING) / DOT_SPACING));
			rows = Math.max(0, Math.floor((height - DOT_SPACING) / DOT_SPACING));
			gameRows = Math.min(
				rows,
				Math.max(0, Math.floor((height - SCORE_LINE_CLEARANCE) / DOT_SPACING)),
			);
			left = (width - cols * DOT_SPACING) / 2 + DOT_SPACING / 2;
			dots = [];
			for (let r = 0; r < rows; r += 1) {
				for (let c = 0; c < cols; c += 1) {
					dots.push(cellCenter(c, r));
				}
			}
			needsDraw = true;
			// A game carries on through a resize unless it no longer fits.
			if (
				game &&
				[...game.body, game.food].some(({ c, r }) => c >= cols || r >= gameRows)
			) {
				play();
			}
		};

		const onPointer = (event: PointerEvent): void => {
			const rect = canvas.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			if (
				x < -TRAIL_RADIUS ||
				y < -TRAIL_RADIUS ||
				x > width + TRAIL_RADIUS ||
				y > height + TRAIL_RADIUS
			) {
				return;
			}
			const head = trail[trail.length - 1];
			// Barely moved: keep the head lit instead of stacking points.
			if (head && Math.hypot(x - head.x, y - head.y) < TRAIL_MIN_STEP) {
				head.born = performance.now();
				return;
			}
			trail.push({ x, y, born: performance.now() });
			if (trail.length > TRAIL_MAX_POINTS) {
				trail.shift();
			}
		};

		// Keys typed into a field outside this chat belong to that field.
		const isOtherField = (target: EventTarget | null): boolean => {
			if (!isField(target)) {
				return false;
			}
			let chat = canvas.parentElement;
			while (chat && !chat.querySelector('textarea')) {
				chat = chat.parentElement;
			}
			return !chat?.contains(target);
		};

		const onKeyDown = (event: KeyboardEvent): void => {
			if (isOtherField(event.target)) {
				return;
			}
			const key = event.key.toLowerCase();
			if (game) {
				if (key === 'escape') {
					event.preventDefault();
					quit();
					return;
				}
				const next = SNAKE_DIRECTIONS[key];
				if (next) {
					// Steering keys drive the snake, not the input; no turning back onto the neck.
					event.preventDefault();
					if (next.c !== -game.dir.c || next.r !== -game.dir.r) {
						game.nextDir = next;
					}
				}
				return;
			}
			// Arrows in the chat's input move its caret instead.
			if (canReplay && key.startsWith('arrow') && !isField(event.target)) {
				event.preventDefault();
				play();
				return;
			}
			recentKeys.push(key);
			if (recentKeys.length > KONAMI_CODE.length) {
				recentKeys.shift();
			}
			if (recentKeys.join() === KONAMI_CODE.join()) {
				recentKeys.length = 0;
				isSnakeUnlocked = true;
				play();
			}
		};

		const onClick = (): void => {
			if (isSnakeUnlocked && !game) {
				play();
			}
		};

		// The snake and its food: flat white dots the size of their neighbours.
		const stepAndDrawSnake = (now: number): void => {
			if (game && now - lastStep >= SNAKE_STEP_MS) {
				lastStep = now;
				const next = stepSnake(game, cols, gameRows);
				if (next) {
					if (next.score !== game.score) {
						showScoreLine(playingLabel(next.score));
					}
					game = next;
				} else {
					endGame(game.score);
				}
			}
			if (game) {
				const sizeAt = (y: number): number =>
					DOT_RADIUS + Math.min(gameFloor(y, height), 1.2) * 0.7;
				const food = cellCenter(game.food.c, game.food.r);
				drawDot(ctx, food.x, food.y, sizeAt(food.y), snakeColors.food);
				game.body.forEach((cell, i) => {
					const { x, y } = cellCenter(cell.c, cell.r);
					drawDot(
						ctx,
						x,
						y,
						sizeAt(y),
						i === 0 ? snakeColors.head : snakeColors.body,
					);
				});
			}
		};

		const draw = (now: number): void => {
			const hadTrail = trail.length > 0;
			for (let i = trail.length - 1; i >= 0; i -= 1) {
				if (now - trail[i].born >= TRAIL_LIFE_MS) {
					trail.splice(i, 1);
				}
			}
			if (isStill && !game && !hadTrail && !needsDraw) {
				frame = requestAnimationFrame(draw);
				return;
			}
			needsDraw = false;

			const t = isStill ? STILL_TIME_MS : now;
			ctx.clearRect(0, 0, width, height);

			drawAuroraDots(ctx, dots, {
				t,
				now,
				height,
				trail,
				isGameOn: game !== null,
				isDarkMode,
				// Keeps the score line's strip clear of dots.
				cutoffY: isScoreLineShown ? gameRows * DOT_SPACING : Infinity,
			});

			stepAndDrawSnake(now);

			frame = requestAnimationFrame(draw);
		};

		const observer = new ResizeObserver(layout);
		observer.observe(canvas);
		layout();
		window.addEventListener('pointermove', onPointer);
		window.addEventListener('pointerdown', onPointer);
		window.addEventListener('keydown', onKeyDown);
		canvas.addEventListener('click', onClick);
		showPlayCursor();
		frame = requestAnimationFrame(draw);

		return (): void => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			window.clearTimeout(labelTimer);
			setLabel(null);
			if (game) {
				onGameChangeRef.current?.(false);
			}
			window.removeEventListener('pointermove', onPointer);
			window.removeEventListener('pointerdown', onPointer);
			window.removeEventListener('keydown', onKeyDown);
			canvas.removeEventListener('click', onClick);
		};
	}, [canvasRef, isDarkMode]);

	return label;
}
