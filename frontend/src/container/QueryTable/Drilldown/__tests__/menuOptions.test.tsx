import { getBaseContextConfig } from '../menuOptions';

const buildConfig = (
	overrides: Partial<Parameters<typeof getBaseContextConfig>[0]> = {},
): ReturnType<typeof getBaseContextConfig> =>
	getBaseContextConfig({
		handleBaseDrilldown: jest.fn(),
		setSubMenu: jest.fn(),
		showBreakoutOption: true,
		...overrides,
	});

const visibleKeys = (
	config: ReturnType<typeof getBaseContextConfig>,
): string[] => config.filter((item) => !item.hidden).map((item) => item.key);

describe('getBaseContextConfig', () => {
	it('offers view-in-explorer and breakout actions', () => {
		expect(visibleKeys(buildConfig())).toStrictEqual([
			'view_logs',
			'view_traces',
			'breakout',
		]);
	});

	it('hides breakout when the caller opts out', () => {
		expect(visibleKeys(buildConfig({ showBreakoutOption: false }))).toStrictEqual(
			['view_logs', 'view_traces'],
		);
	});

	// The V1 dashboard-variables submenu was removed with the V1 dashboard: it was
	// route-gated to /dashboard/:id, which V2 now serves through its own drilldown.
	it('never offers a dashboard-variables submenu', () => {
		expect(buildConfig().map((item) => item.key)).not.toContain(
			'dashboard_variables',
		);
	});

	it('routes view actions through handleBaseDrilldown', () => {
		const handleBaseDrilldown = jest.fn();
		const config = buildConfig({ handleBaseDrilldown });

		config.find((item) => item.key === 'view_logs')?.onClick();

		expect(handleBaseDrilldown).toHaveBeenCalledWith('view_logs');
	});
});
