import type { SectionConfig } from '../../types/sections';

// The List spec is `selectFields` (the chosen columns); no formatting / axes /
// thresholds apply. The Columns section edits selectFields; Context Links is the
// shared panel-level section.
export const sections: SectionConfig[] = [
	{ kind: 'columns' },
	{ kind: 'contextLinks' },
];
