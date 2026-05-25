export {};

type BootData = typeof import('../bootData');

function loadModule(settings?: object): BootData {
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
	it('all sub-objects are defined and empty', () => {
		const { bootSettings } = loadModule();
		expect(bootSettings.posthog).toStrictEqual({});
		expect(bootSettings.appcues).toStrictEqual({});
	});

	it('enabled fields are undefined', () => {
		const { bootSettings } = loadModule();
		expect(bootSettings.posthog.enabled).toBeUndefined();
		expect(bootSettings.appcues.enabled).toBeUndefined();
	});
});

describe('when window.signozBootData.settings is populated', () => {
	it('reads posthog enabled true', () => {
		const { bootSettings } = loadModule({ posthog: { enabled: true } });
		expect(bootSettings.posthog.enabled).toBe(true);
	});

	it('reads posthog enabled false', () => {
		const { bootSettings } = loadModule({ posthog: { enabled: false } });
		expect(bootSettings.posthog.enabled).toBe(false);
	});

	it('reads appcues enabled true', () => {
		const { bootSettings } = loadModule({ appcues: { enabled: true } });
		expect(bootSettings.appcues.enabled).toBe(true);
	});

	it('reads appcues enabled false', () => {
		const { bootSettings } = loadModule({ appcues: { enabled: false } });
		expect(bootSettings.appcues.enabled).toBe(false);
	});

	it('missing sub-namespaces fall back to empty objects', () => {
		const { bootSettings } = loadModule({ posthog: { enabled: true } });
		expect(bootSettings.appcues).toStrictEqual({});
		expect(bootSettings.appcues.enabled).toBeUndefined();
	});
});

describe('when window.signozBootData exists but settings is undefined', () => {
	it('all sub-objects are empty', () => {
		(window as any).signozBootData = {};
		let mod!: BootData;
		jest.isolateModules(() => {
			// oxlint-disable-next-line typescript-eslint/no-require-imports, typescript-eslint/no-var-requires
			mod = require('../bootData');
		});
		expect(mod.bootSettings.posthog).toStrictEqual({});
		expect(mod.bootSettings.appcues).toStrictEqual({});
	});
});
