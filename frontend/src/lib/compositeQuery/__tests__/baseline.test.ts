/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                           ⚠️  CRITICAL WARNING ⚠️                           ║
 * ╠════════════════════════════════════════════════════════════════════════════╣
 * ║  These baselines are FROZEN FOREVER. They must NEVER be modified.          ║
 * ║                                                                            ║
 * ║  WHY: Every URL ever emitted by the compositeQuery serializer encodes a    ║
 * ║  diff against these exact baselines. Changing a single byte here silently  ║
 * ║  BREAKS ALL EXISTING URLs — dashboards, saved views, shared links, etc.    ║
 * ║                                                                            ║
 * ║  If these snapshot tests fail:                                             ║
 * ║    1. DO NOT update the snapshots                                          ║
 * ║    2. REVERT your changes to baseline.ts immediately                       ║
 * ║    3. If you need a new schema, create a NEW versioned baseline:           ║
 * ║       - METRICS_BASELINE_V2, LOGS_BASELINE_V2, TRACES_BASELINE_V2          ║
 * ║       - Create a new adapter (e.g., V2~) that uses the new baselines       ║
 * ║       - Keep the old baselines untouched for backwards compatibility       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import getBaselineByTag, { pickBaseline } from '../baseline';
import { METRICS_BASELINE_V1 } from 'lib/compositeQuery/baseline.metrics';
import { LOGS_BASELINE_V1 } from 'lib/compositeQuery/baseline.logs';
import { TRACES_BASELINE_V1 } from 'lib/compositeQuery/baseline.traces';

describe('baseline immutability snapshots', () => {
	/**
	 * ⛔ DO NOT UPDATE THIS SNAPSHOT ⛔
	 * If this fails, you broke URL compatibility. Revert your changes.
	 */
	it('METRICS_BASELINE_V1 must never change', () => {
		expect(METRICS_BASELINE_V1).toMatchSnapshot();
	});

	/**
	 * ⛔ DO NOT UPDATE THIS SNAPSHOT ⛔
	 * If this fails, you broke URL compatibility. Revert your changes.
	 */
	it('LOGS_BASELINE_V1 must never change', () => {
		expect(LOGS_BASELINE_V1).toMatchSnapshot();
	});

	/**
	 * ⛔ DO NOT UPDATE THIS SNAPSHOT ⛔
	 * If this fails, you broke URL compatibility. Revert your changes.
	 */
	it('TRACES_BASELINE_V1 must never change', () => {
		expect(TRACES_BASELINE_V1).toMatchSnapshot();
	});
});

describe('pickBaseline', () => {
	it('returns metrics baseline for metrics dataSource', () => {
		const query = {
			builder: { queryData: [{ dataSource: 'metrics' }] },
		} as any;

		const result = pickBaseline(query);

		expect(result.baseline).toBe(METRICS_BASELINE_V1);
		expect(result.tag).toBe('m');
	});

	it('returns logs baseline for logs dataSource', () => {
		const query = {
			builder: { queryData: [{ dataSource: 'logs' }] },
		} as any;

		const result = pickBaseline(query);

		expect(result.baseline).toBe(LOGS_BASELINE_V1);
		expect(result.tag).toBe('l');
	});

	it('returns traces baseline for traces dataSource', () => {
		const query = {
			builder: { queryData: [{ dataSource: 'traces' }] },
		} as any;

		const result = pickBaseline(query);

		expect(result.baseline).toBe(TRACES_BASELINE_V1);
		expect(result.tag).toBe('t');
	});

	it('defaults to metrics baseline for unknown dataSource', () => {
		const query = {
			builder: { queryData: [{ dataSource: 'unknown' }] },
		} as any;

		const result = pickBaseline(query);

		expect(result.baseline).toBe(METRICS_BASELINE_V1);
		expect(result.tag).toBe('m');
	});

	it('defaults to metrics baseline when queryData is empty', () => {
		const query = {
			builder: { queryData: [] },
		} as any;

		const result = pickBaseline(query);

		expect(result.baseline).toBe(METRICS_BASELINE_V1);
		expect(result.tag).toBe('m');
	});
});

describe('getBaselineByTag', () => {
	it('returns LOGS_BASELINE_V1 for tag "l"', () => {
		expect(getBaselineByTag('l')).toBe(LOGS_BASELINE_V1);
	});

	it('returns TRACES_BASELINE_V1 for tag "t"', () => {
		expect(getBaselineByTag('t')).toBe(TRACES_BASELINE_V1);
	});

	it('returns METRICS_BASELINE_V1 for tag "m"', () => {
		expect(getBaselineByTag('m')).toBe(METRICS_BASELINE_V1);
	});
});
