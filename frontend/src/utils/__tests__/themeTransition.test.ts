import {
	canAnimateThemeTransition,
	runThemeTransition,
	THEME_WIPE_ACTIVE_CLASS,
} from '../themeTransition';

type StartVT = (cb: () => void) => {
	ready: Promise<void>;
	finished: Promise<void>;
};

const installStartViewTransition = (impl?: StartVT): jest.Mock => {
	const defaultImpl: StartVT = (cb) => {
		cb();
		return { ready: Promise.resolve(), finished: Promise.resolve() };
	};
	const fn = jest.fn(impl ?? defaultImpl);
	Object.defineProperty(document, 'startViewTransition', {
		configurable: true,
		writable: true,
		value: fn,
	});
	return fn;
};

const removeStartViewTransition = (): void => {
	Object.defineProperty(document, 'startViewTransition', {
		configurable: true,
		writable: true,
		value: undefined,
	});
};

const setReducedMotion = (matches: boolean): void => {
	(window.matchMedia as jest.Mock) = jest
		.fn()
		.mockImplementation((query: string) => ({
			matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
			media: query,
			addListener: jest.fn(),
			removeListener: jest.fn(),
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
		}));
};

describe('canAnimateThemeTransition', () => {
	afterEach(() => {
		removeStartViewTransition();
	});

	it('returns false when document.startViewTransition is unavailable', () => {
		removeStartViewTransition();
		setReducedMotion(false);
		expect(canAnimateThemeTransition()).toBe(false);
	});

	it('returns false when prefers-reduced-motion is reduce', () => {
		installStartViewTransition();
		setReducedMotion(true);
		expect(canAnimateThemeTransition()).toBe(false);
	});

	it('returns true when API is supported and motion is allowed', () => {
		installStartViewTransition();
		setReducedMotion(false);
		expect(canAnimateThemeTransition()).toBe(true);
	});
});

describe('runThemeTransition', () => {
	afterEach(() => {
		removeStartViewTransition();
		document.documentElement.classList.remove(THEME_WIPE_ACTIVE_CLASS);
	});

	it('falls back to running applyChange directly when API is missing', () => {
		removeStartViewTransition();
		const applyChange = jest.fn();
		runThemeTransition(applyChange);
		expect(applyChange).toHaveBeenCalledTimes(1);
		expect(
			document.documentElement.classList.contains(THEME_WIPE_ACTIVE_CLASS),
		).toBe(false);
	});

	it('invokes startViewTransition and runs applyChange inside its callback', () => {
		const startVT = installStartViewTransition();
		const applyChange = jest.fn();
		runThemeTransition(applyChange);
		expect(startVT).toHaveBeenCalledTimes(1);
		expect(applyChange).toHaveBeenCalledTimes(1);
	});

	it('toggles the wipe-active class on <html> for the lifetime of the transition', async () => {
		let resolveFinished: () => void = (): void => {};
		installStartViewTransition((cb) => {
			cb();
			return {
				ready: Promise.resolve(),
				finished: new Promise<void>((resolve) => {
					resolveFinished = resolve;
				}),
			};
		});

		runThemeTransition(() => undefined);

		expect(
			document.documentElement.classList.contains(THEME_WIPE_ACTIVE_CLASS),
		).toBe(true);

		resolveFinished();
		await Promise.resolve();
		await Promise.resolve();

		expect(
			document.documentElement.classList.contains(THEME_WIPE_ACTIVE_CLASS),
		).toBe(false);
	});

	it('keeps the wipe-active class through overlapping transitions', async () => {
		let resolveA: () => void = (): void => {};
		let resolveB: () => void = (): void => {};
		let callIndex = 0;
		installStartViewTransition((cb) => {
			cb();
			callIndex += 1;
			if (callIndex === 1) {
				return {
					ready: Promise.resolve(),
					finished: new Promise<void>((resolve) => {
						resolveA = resolve;
					}),
				};
			}
			return {
				ready: Promise.resolve(),
				finished: new Promise<void>((resolve) => {
					resolveB = resolve;
				}),
			};
		});

		runThemeTransition(() => undefined);
		runThemeTransition(() => undefined);

		expect(
			document.documentElement.classList.contains(THEME_WIPE_ACTIVE_CLASS),
		).toBe(true);

		// First transition finishes — class must stay because B is still in flight.
		resolveA();
		await Promise.resolve();
		await Promise.resolve();
		expect(
			document.documentElement.classList.contains(THEME_WIPE_ACTIVE_CLASS),
		).toBe(true);

		resolveB();
		await Promise.resolve();
		await Promise.resolve();
		expect(
			document.documentElement.classList.contains(THEME_WIPE_ACTIVE_CLASS),
		).toBe(false);
	});

	it('falls back to applyChange and releases the class when startViewTransition throws before its callback runs', () => {
		installStartViewTransition(() => {
			throw new Error('boom');
		});
		const applyChange = jest.fn();
		runThemeTransition(applyChange);
		expect(applyChange).toHaveBeenCalledTimes(1);
		expect(
			document.documentElement.classList.contains(THEME_WIPE_ACTIVE_CLASS),
		).toBe(false);
	});

	it('does not double-invoke applyChange when startViewTransition throws after its callback runs', () => {
		installStartViewTransition((cb) => {
			cb();
			throw new Error('post-cb');
		});
		const applyChange = jest.fn();
		runThemeTransition(applyChange);
		expect(applyChange).toHaveBeenCalledTimes(1);
		expect(
			document.documentElement.classList.contains(THEME_WIPE_ACTIVE_CLASS),
		).toBe(false);
	});
});
