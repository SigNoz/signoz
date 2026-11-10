import { ChevronDown } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import { NEW_PANEL_SIZE } from '../../../patchOps';
import { usePanelPickerTargetStore } from '../../../store/usePanelPickerTargetStore';
import {
	GRID_MARGIN,
	gridItemHeight,
	gridItemWidth,
} from '../SectionGrid/gridMetrics';
import NewPanelPlaceholder from '../SectionGrid/NewPanelPlaceholder';

import styles from './DraftSection.module.scss';

function DraftSection(): JSX.Element | null {
	const draft = usePanelPickerTargetStore((s) => s.draftSection);

	if (draft === null) {
		return null;
	}
	const title = draft.title.trim();

	return (
		<div className={styles.draftSection} data-testid="draft-section">
			<div className={styles.header}>
				<ChevronDown size={14} />
				<Typography.Text className={title ? styles.title : styles.placeholder}>
					{title || 'New section'}
				</Typography.Text>
			</div>
			<div style={{ padding: GRID_MARGIN }}>
				<div
					style={{
						width: gridItemWidth(NEW_PANEL_SIZE.width),
						height: gridItemHeight(NEW_PANEL_SIZE.height),
					}}
				>
					<NewPanelPlaceholder kind={draft.panelKind} />
				</div>
			</div>
		</div>
	);
}

export default DraftSection;
