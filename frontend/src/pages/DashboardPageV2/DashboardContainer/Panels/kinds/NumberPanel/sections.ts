import type { SectionConfig } from '../../types/sections';

export const sections: SectionConfig[] = [
	{ kind: 'visualization', controls: { timePreference: true } },
	{ kind: 'formatting', controls: { unit: true, decimals: true } },
	{ kind: 'thresholds', controls: { variant: 'comparison' } },
	{ kind: 'contextLinks' },
];
