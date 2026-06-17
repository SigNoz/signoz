import type { SectionConfig } from '../../types/sections';

// The List spec is `selectFields` (the chosen columns); no formatting / axes /
// thresholds apply. Columns are edited below the query builder (not the config
// pane), so only the shared Context Links section appears here.
export const sections: SectionConfig[] = [{ kind: 'contextLinks' }];
