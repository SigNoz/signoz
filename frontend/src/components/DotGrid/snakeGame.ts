// Snake on the dot grid, the easter egg the Konami code unlocks.

interface Cell {
	c: number;
	r: number;
}

export interface SnakeGame {
	body: Cell[];
	dir: Cell;
	nextDir: Cell;
	food: Cell;
	score: number;
}

export const SNAKE_STEP_MS = 110;

// Lowercase: keys are lowercased before matching, so B/b and A/a both count.
export const KONAMI_CODE = [
	'arrowup',
	'arrowup',
	'arrowdown',
	'arrowdown',
	'arrowleft',
	'arrowright',
	'arrowleft',
	'arrowright',
	'b',
	'a',
];

export const SNAKE_DIRECTIONS: Record<string, Cell> = {
	arrowup: { c: 0, r: -1 },
	w: { c: 0, r: -1 },
	arrowdown: { c: 0, r: 1 },
	s: { c: 0, r: 1 },
	arrowleft: { c: -1, r: 0 },
	a: { c: -1, r: 0 },
	arrowright: { c: 1, r: 0 },
	d: { c: 1, r: 0 },
};

const isOn = (cells: Cell[], cell: Cell): boolean =>
	cells.some(({ c, r }) => c === cell.c && r === cell.r);

/** A free cell for the food, or null when the snake fills the grid. */
function placeFood(body: Cell[], cols: number, rows: number): Cell | null {
	const free: Cell[] = [];
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (!isOn(body, { c, r })) {
				free.push({ c, r });
			}
		}
	}
	return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

/** A four-cell snake in the middle heading right, or null when the grid is too small. */
export function startSnake(cols: number, rows: number): SnakeGame | null {
	if (cols < 8 || rows < 6) {
		return null;
	}
	const c = Math.floor(cols / 2);
	const r = Math.floor(rows / 2);
	const body = [0, 1, 2, 3].map((i) => ({ c: c - i, r }));
	const food = placeFood(body, cols, rows);
	if (!food) {
		return null;
	}
	const right = { c: 1, r: 0 };
	return { body, dir: right, nextDir: right, food, score: 0 };
}

/** Moves the snake one cell; null when it hits a wall, itself, or fills the grid. */
export function stepSnake(
	game: SnakeGame,
	cols: number,
	rows: number,
): SnakeGame | null {
	const dir = game.nextDir;
	const head = { c: game.body[0].c + dir.c, r: game.body[0].r + dir.r };
	const ate = head.c === game.food.c && head.r === game.food.r;
	const kept = ate ? game.body : game.body.slice(0, -1);
	if (
		head.c < 0 ||
		head.c >= cols ||
		head.r < 0 ||
		head.r >= rows ||
		isOn(kept, head)
	) {
		return null;
	}
	const body = [head, ...kept];
	const food = ate ? placeFood(body, cols, rows) : game.food;
	if (!food) {
		return null;
	}
	return { ...game, body, dir, food, score: game.score + (ate ? 1 : 0) };
}
