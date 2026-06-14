import type { SectionConfig } from '../../types/sections';

export const sections: SectionConfig[] = [
	{ kind: 'legend', controls: { position: true } },
	{ kind: 'buckets', controls: { count: true } },
	{ kind: 'contextLinks' },
];
