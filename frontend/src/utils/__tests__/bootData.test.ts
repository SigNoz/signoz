export {};

type BootData = typeof import('../bootData');

function loadModule(settings?: object | null): BootData {
	(window as any).signozBootData =
		settings !== undefined ? { settings } : undefined;
	let mod!: BootData;
	jest.isolateModules(() => {
		// oxlint-disable-next-line typescript-eslint/no-require-imports, typescript-eslint/no-var-requires
		mod = require('../bootData');
	});
	return mod;
}

afterEach(() => {
	delete (window as any).signozBootData;
});

describe('when window.signozBootData is absent', () => {
	it('defaults posthog and appcues to enabled', () => {
		const { bootSettings } = loadModule();
		expect(bootSettings.posthog.enabled).toBe(true);
		expect(bootSettings.appcues.enabled).toBe(true);
	});
});

describe('when window.signozBootData.settings is null (injection failed)', () => {
	it('defaults posthog and appcues to enabled', () => {
		const { bootSettings } = loadModule(null);
		expect(bootSettings.posthog.enabled).toBe(true);
		expect(bootSettings.appcues.enabled).toBe(true);
	});
});

describe('when window.signozBootData.settings is populated', () => {
	it('reads posthog enabled: true', () => {
		const { bootSettings } = loadModule({ posthog: { enabled: true } });
		expect(bootSettings.posthog.enabled).toBe(true);
	});

	it('reads posthog enabled: false', () => {
		const { bootSettings } = loadModule({ posthog: { enabled: false } });
		expect(bootSettings.posthog.enabled).toBe(false);
	});

	it('reads appcues enabled: true', () => {
		const { bootSettings } = loadModule({ appcues: { enabled: true } });
		expect(bootSettings.appcues.enabled).toBe(true);
	});

	it('reads appcues enabled: false', () => {
		const { bootSettings } = loadModule({ appcues: { enabled: false } });
		expect(bootSettings.appcues.enabled).toBe(false);
	});

	it('missing sub-namespace defaults to enabled', () => {
		const { bootSettings } = loadModule({ posthog: { enabled: false } });
		expect(bootSettings.appcues.enabled).toBe(true);
	});
});

describe('when window.signozBootData exists but settings is undefined', () => {
	it('defaults posthog and appcues to enabled', () => {
		(window as any).signozBootData = {};
		let mod!: BootData;
		jest.isolateModules(() => {
			// oxlint-disable-next-line typescript-eslint/no-require-imports, typescript-eslint/no-var-requires
			mod = require('../bootData');
		});
		expect(mod.bootSettings.posthog.enabled).toBe(true);
		expect(mod.bootSettings.appcues.enabled).toBe(true);
	});
});
