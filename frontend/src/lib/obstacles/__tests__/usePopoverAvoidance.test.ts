import { act, renderHook } from 'tests/test-utils';

import type { Obstacle, Rect } from '../types';
import { usePopoverAvoidance } from '../usePopoverAvoidance';

const CHAT: Rect = { x: 882, y: 286, width: 384, height: 478 };
// 1280 - 882 + 8px gap.
const CLEARANCE = 406;

function createObstacle(initial: Rect | null): {
	obstacle: Obstacle;
	show: (rect: Rect | null) => void;
} {
	let rect = initial;
	const listeners = new Set<() => void>();
	return {
		obstacle: {
			getRect: () => rect,
			subscribe: (onChange) => {
				listeners.add(onChange);
				return (): void => {
					listeners.delete(onChange);
				};
			},
		},
		show: (next): void => {
			rect = next;
			listeners.forEach((listener) => listener());
		},
	};
}

describe('usePopoverAvoidance', () => {
	const originalInnerWidth = window.innerWidth;

	beforeEach(() => {
		window.innerWidth = 1280;
	});

	afterEach(() => {
		window.innerWidth = originalInnerWidth;
	});

	it('opens clear of an obstacle that already shows, without sliding', () => {
		const obstacles = [createObstacle(CHAT).obstacle];

		const { result } = renderHook(() => usePopoverAvoidance(obstacles, true));

		expect(result.current).toStrictEqual({
			collisionPadding: { right: CLEARANCE },
			isSliding: false,
		});
	});

	it('slides aside as the obstacle shows, and back as it hides', () => {
		const { obstacle, show } = createObstacle(null);
		const obstacles = [obstacle];
		const { result } = renderHook(() => usePopoverAvoidance(obstacles, true));

		act(() => show(CHAT));

		expect(result.current).toStrictEqual({
			collisionPadding: { right: CLEARANCE },
			isSliding: true,
		});

		act(() => show(null));

		expect(result.current.collisionPadding).toStrictEqual({ right: 0 });
	});
});
