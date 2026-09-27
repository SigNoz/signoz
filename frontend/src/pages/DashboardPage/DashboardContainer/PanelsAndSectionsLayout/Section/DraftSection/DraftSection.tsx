import { useRef } from 'react';
import { ChevronDown } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import { NEW_PANEL_SIZE } from '../../../patchOps';
import { usePanelPickerTargetStore } from '../../../store/usePanelPickerTargetStore';
import { usePanelPickerReveal } from '../hooks/usePanelPickerReveal';
import { gridHeight } from '../SectionGrid/gridMetrics';

import styles from './DraftSection.module.scss';

function DraftSection(): JSX.Element | null {
	const title = usePanelPickerTargetStore((s) => s.draftSectionTitle);
	const ref = useRef<HTMLDivElement>(null);
	usePanelPickerReveal(ref, title !== null);

	if (title === null) {
		return null;
	}

	return (
		<div ref={ref} className={styles.draftSection} data-testid="draft-section">
			<div className={styles.header}>
				<ChevronDown size={14} />
				<Typography.Text
					className={title.trim() ? styles.title : styles.placeholder}
				>
					{title.trim() || 'New section'}
				</Typography.Text>
			</div>
			<div
				className={styles.body}
				style={{ height: gridHeight(NEW_PANEL_SIZE.height) }}
			>
				New panel will be added here
			</div>
		</div>
	);
}

export default DraftSection;
