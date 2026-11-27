import { findOldSemconvNames, getSemconvRename } from 'utils/semconv';

describe('semantic convention helpers', () => {
	it('returns the current name for an old attribute', () => {
		expect(getSemconvRename('deployment.environment')).toMatchObject({
			old: 'deployment.environment',
			current: 'deployment.environment.name',
		});
	});

	it('finds old names in editor text without matching larger custom names', () => {
		expect(
			findOldSemconvNames(
				"deployment.environment = 'prod' AND custom.db.system.value = 'x'",
			),
		).toStrictEqual([
			expect.objectContaining({
				old: 'deployment.environment',
				current: 'deployment.environment.name',
			}),
		]);
	});

	it('does not warn for current names', () => {
		expect(
			findOldSemconvNames('deployment.environment.name = prod'),
		).toStrictEqual([]);
	});
});
