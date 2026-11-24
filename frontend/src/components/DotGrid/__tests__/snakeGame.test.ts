import type { SnakeGame } from '../snakeGame';
import { startSnake, stepSnake } from '../snakeGame';

const COLS = 10;
const ROWS = 6;

function newGame(): SnakeGame {
	const game = startSnake(COLS, ROWS);
	if (!game) {
		throw new Error('a 10 × 6 grid fits a game');
	}
	return game;
}

describe('snakeGame', () => {
	beforeEach(() => {
		// Food lands on the first free cell, the top-left corner.
		jest.spyOn(Math, 'random').mockReturnValue(0);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('needs at least an 8 × 6 grid', () => {
		expect(startSnake(7, 6)).toBeNull();
		expect(startSnake(8, 5)).toBeNull();
	});

	it('starts four cells long in the middle, heading right', () => {
		expect(newGame()).toStrictEqual({
			body: [
				{ c: 5, r: 3 },
				{ c: 4, r: 3 },
				{ c: 3, r: 3 },
				{ c: 2, r: 3 },
			],
			dir: { c: 1, r: 0 },
			nextDir: { c: 1, r: 0 },
			food: { c: 0, r: 0 },
			score: 0,
		});
	});

	it('moves one cell in its direction', () => {
		const next = stepSnake(newGame(), COLS, ROWS);

		expect(next?.body).toStrictEqual([
			{ c: 6, r: 3 },
			{ c: 5, r: 3 },
			{ c: 4, r: 3 },
			{ c: 3, r: 3 },
		]);
		expect(next?.score).toBe(0);
	});

	it('grows and scores when it eats', () => {
		const next = stepSnake({ ...newGame(), food: { c: 6, r: 3 } }, COLS, ROWS);

		expect(next?.body).toHaveLength(5);
		expect(next?.score).toBe(1);
	});

	it('ends when it hits a wall', () => {
		const atEdge: SnakeGame = {
			...newGame(),
			body: [
				{ c: 9, r: 3 },
				{ c: 8, r: 3 },
				{ c: 7, r: 3 },
				{ c: 6, r: 3 },
			],
		};

		expect(stepSnake(atEdge, COLS, ROWS)).toBeNull();
	});

	it('ends when it runs into itself', () => {
		const coiled: SnakeGame = {
			...newGame(),
			body: [
				{ c: 5, r: 3 },
				{ c: 5, r: 4 },
				{ c: 6, r: 4 },
				{ c: 6, r: 3 },
				{ c: 7, r: 3 },
			],
		};

		expect(stepSnake(coiled, COLS, ROWS)).toBeNull();
	});

	it('moves into the cell its tail is leaving', () => {
		const up = { c: 0, r: -1 };
		const turnedDownThenLeft: SnakeGame = {
			...newGame(),
			body: [
				{ c: 4, r: 4 },
				{ c: 5, r: 4 },
				{ c: 5, r: 3 },
				{ c: 4, r: 3 },
			],
			nextDir: up,
		};

		expect(stepSnake(turnedDownThenLeft, COLS, ROWS)?.body).toStrictEqual([
			{ c: 4, r: 3 },
			{ c: 4, r: 4 },
			{ c: 5, r: 4 },
			{ c: 5, r: 3 },
		]);
	});
});
