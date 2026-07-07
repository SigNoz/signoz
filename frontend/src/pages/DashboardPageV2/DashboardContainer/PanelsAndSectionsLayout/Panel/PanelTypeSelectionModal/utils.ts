import { LayoutDashboard, Rows2 } from '@signozhq/icons';

import type { DashboardSection } from '../../../utils';
import type { SectionOption } from './types';

const ROOT_LABEL = 'Dashboard (root)';
const ROOT_DESCRIPTION = 'Top level — no section';
const SECTION_DESCRIPTION = 'Section';

/** Maps dashboard sections to section-picker options (untitled → "root"). */
export function buildSectionOptions(
	sections: DashboardSection[],
): SectionOption[] {
	return sections.map((section) => {
		const isRoot = !section.title && section.layoutIndex === 0;
		return {
			value: String(section.layoutIndex),
			layoutIndex: section.layoutIndex,
			label: isRoot ? ROOT_LABEL : (section.title as string),
			description: isRoot ? ROOT_DESCRIPTION : SECTION_DESCRIPTION,
			isRoot,
			Icon: isRoot ? LayoutDashboard : Rows2,
		};
	});
}

/**
 * Picks the option the picker should open on: the section the "Add panel" was
 * triggered from when present and still valid, otherwise the first option.
 */
export function resolveDefaultSectionValue(
	options: SectionOption[],
	defaultLayoutIndex: number | undefined,
): string {
	const fallback = options[0]?.value ?? '';
	if (defaultLayoutIndex === undefined) {
		return fallback;
	}
	const target = String(defaultLayoutIndex);
	return options.some((option) => option.value === target) ? target : fallback;
}
