import type { Posthog } from 'types/generated/webSettings';

const mockInit = jest.fn();
const mockIdentify = jest.fn();
const mockReset = jest.fn();

jest.mock('posthog-js', () => ({
	__esModule: true,
	default: {
		init: mockInit,
		identify: mockIdentify,
		reset: mockReset,
	},
}));

const ENABLED: Posthog = {
	enabled: true,
	key: 'phc_test',
	apiHost: 'https://ph.example.com',
	uiHost: 'https://ui.example.com',
};

function setPostHogSettings(posthog: Posthog): void {
	window.signozBootData = {
		settings: {
			appcues: { enabled: false },
			posthog,
			pylon: { enabled: false },
			sentry: { enabled: false },
		},
	};
}

describe('posthog loader', () => {
	let loader: typeof import('../posthog');

	beforeEach(async () => {
		jest.resetModules();
		loader = await import('../posthog');
		setPostHogSettings(ENABLED);
	});

	afterEach(() => {
		window.signozBootData = undefined;
	});

	it.each([
		['disabled', { ...ENABLED, enabled: false }],
		['missing a key', { ...ENABLED, key: undefined }],
	])('never loads posthog-js when it is %s', async (_, settings) => {
		setPostHogSettings(settings);
		const callback = jest.fn();

		expect(loader.loadPostHog()).toBeUndefined();
		await loader.withPostHog(callback);
		await loader.resetPostHog();

		expect(callback).not.toHaveBeenCalled();
		expect(mockInit).not.toHaveBeenCalled();
		expect(mockReset).not.toHaveBeenCalled();
		expect(loader.getLoadedPostHog()).toBeUndefined();
	});

	it('initializes once with the boot settings', async () => {
		const first = loader.loadPostHog();
		const second = loader.loadPostHog();

		expect(second).toBe(first);
		await first;

		expect(mockInit).toHaveBeenCalledTimes(1);
		expect(mockInit).toHaveBeenCalledWith('phc_test', {
			api_host: 'https://ph.example.com',
			ui_host: 'https://ui.example.com',
			person_profiles: 'identified_only',
		});
	});

	it('runs a call made before the module loads against the initialized instance', async () => {
		const identified = loader.withPostHog((posthog) =>
			posthog.identify('user-1', { role: 'ADMIN' }),
		);

		expect(mockIdentify).not.toHaveBeenCalled();
		expect(loader.getLoadedPostHog()).toBeUndefined();

		await loader.loadPostHog();
		await identified;

		expect(mockIdentify).toHaveBeenCalledTimes(1);
		expect(mockIdentify).toHaveBeenCalledWith('user-1', { role: 'ADMIN' });
		expect(mockInit.mock.invocationCallOrder[0]).toBeLessThan(
			mockIdentify.mock.invocationCallOrder[0],
		);
		expect(loader.getLoadedPostHog()).toBeDefined();
	});

	it('does not reset an instance that was never requested', async () => {
		await loader.resetPostHog();

		expect(mockReset).not.toHaveBeenCalled();
	});

	it('resets after the pending load finishes', async () => {
		const loading = loader.loadPostHog();
		const reset = loader.resetPostHog();

		expect(mockReset).not.toHaveBeenCalled();

		await loading;
		await reset;

		expect(mockReset).toHaveBeenCalledTimes(1);
		expect(mockInit.mock.invocationCallOrder[0]).toBeLessThan(
			mockReset.mock.invocationCallOrder[0],
		);
	});
});
