import { LayoutDashboard, Rows2 } from '@signozhq/icons';

import { findRootSection, type DashboardSection } from '../../../utils';
import type { SectionOption } from './types';

const ROOT_LABEL = 'Dashboard (root)';
const ROOT_DESCRIPTION = 'Top level — no section';
const SECTION_DESCRIPTION = 'Section';

const NEW_ROOT_VALUE = 'root';

/** Maps dashboard sections to section-picker options; a sectioned dashboard always offers the root. */
export function buildSectionOptions(
	sections: DashboardSection[],
): SectionOption[] {
	const rootSection = findRootSection(sections);
	const options: SectionOption[] = sections.map((section) => {
		const isRoot = rootSection === section;
		return {
			value: String(section.layoutIndex),
			target: { type: 'section', layoutIndex: section.layoutIndex },
			label: isRoot ? ROOT_LABEL : (section.title as string),
			description: isRoot ? ROOT_DESCRIPTION : SECTION_DESCRIPTION,
			isRoot,
			Icon: isRoot ? LayoutDashboard : Rows2,
		};
	});
	if (!rootSection && sections.some((section) => section.title)) {
		options.unshift({
			value: NEW_ROOT_VALUE,
			target: { type: 'root' },
			label: ROOT_LABEL,
			description: ROOT_DESCRIPTION,
			isRoot: true,
			Icon: LayoutDashboard,
		});
	}
	return options;
}

/**
 * Picks the option the picker should open on: the section the "Add panel" was
 * triggered from when present and still valid, otherwise the dashboard root.
 */
export function resolveDefaultSectionValue(
	options: SectionOption[],
	defaultLayoutIndex: number | undefined,
): string {
	const fallback =
		(options.find((option) => option.isRoot) ?? options[0])?.value ?? '';
	if (defaultLayoutIndex === undefined) {
		return fallback;
	}
	const target = String(defaultLayoutIndex);
	return options.some((option) => option.value === target) ? target : fallback;
}
