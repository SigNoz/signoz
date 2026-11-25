import type { Config } from '@jest/types';

export const REAL_TIMER_APIS: Config.FakeableAPI[] = [
	'hrtime',
	'nextTick',
	'performance',
	'queueMicrotask',
	'requestAnimationFrame',
	'cancelAnimationFrame',
	'requestIdleCallback',
	'cancelIdleCallback',
	'setImmediate',
	'clearImmediate',
	'setInterval',
	'clearInterval',
	'setTimeout',
	'clearTimeout',
];
