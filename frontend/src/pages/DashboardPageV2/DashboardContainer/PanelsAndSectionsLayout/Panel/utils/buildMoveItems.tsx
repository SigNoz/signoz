import { FolderInput, FolderOutput } from '@signozhq/icons';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';

import { findRootSection, type DashboardSection } from '../../../utils';
import type { MovePanelArgs } from '../hooks/useMovePanelToSection';

interface MoveItemsArgs {
	sections: DashboardSection[];
	currentLayoutIndex: number;
	panelId: string;
	movePanel: (args: MovePanelArgs) => Promise<void>;
}

/**
 * The "Move to section" submenu plus a direct "Move out of section" to the
 * untitled root, shown only when the panel sits in a titled section and a root
 * section exists to receive it.
 */
export function buildMoveItems({
	sections,
	currentLayoutIndex,
	panelId,
	movePanel,
}: MoveItemsArgs): MenuItem[] {
	const targets = sections.filter(
		(s) => s.title && s.layoutIndex !== currentLayoutIndex,
	);
	const items: MenuItem[] = [
		{
			key: 'move',
			label: 'Move to section',
			icon: <FolderInput size={14} />,
			...(targets.length === 0
				? { disabled: true }
				: {
						children: targets.map((s) => ({
							key: `move-${s.layoutIndex}`,
							label: s.title,
							onClick: (): void =>
								void movePanel({
									panelId,
									fromLayoutIndex: currentLayoutIndex,
									toLayoutIndex: s.layoutIndex,
								}),
						})),
					}),
		},
	];

	const rootSection = findRootSection(sections);
	if (rootSection && rootSection.layoutIndex !== currentLayoutIndex) {
		items.push({
			key: 'move-to-root',
			label: 'Move out of section',
			icon: <FolderOutput size={14} />,
			onClick: (): void =>
				void movePanel({
					panelId,
					fromLayoutIndex: currentLayoutIndex,
					toLayoutIndex: rootSection.layoutIndex,
				}),
		});
	}
	return items;
}
