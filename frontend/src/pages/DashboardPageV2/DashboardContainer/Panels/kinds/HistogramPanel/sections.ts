import type { SectionConfig } from '../../types/sections';

export const sections: SectionConfig[] = [
	{ kind: 'legend', controls: { position: true, mode: true } },
	{ kind: 'buckets', controls: { count: true } },
];
