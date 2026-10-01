import { getPanelDefinition } from '../registry';
import type { PanelKind } from '../types/panelKind';
import type { ControlledSectionKind, SectionControls } from '../types/sections';

/**
 * The controls a kind declares for one section, or `undefined` when it doesn't expose
 * that section — so callers read `kinds/<Kind>/sections.ts` instead of switching on kind.
 */
export function getSectionControls<K extends ControlledSectionKind>(
	kind: PanelKind,
	sectionKind: K,
): SectionControls[K] | undefined {
	const section = getPanelDefinition(kind).sections.find(
		(candidate) => candidate.kind === sectionKind,
	);
	if (!section || !('controls' in section)) {
		return undefined;
	}
	// `find` can't correlate the matched member's `controls` with `sectionKind`; the
	// SectionConfig union guarantees it.
	return section.controls as SectionControls[K];
}
