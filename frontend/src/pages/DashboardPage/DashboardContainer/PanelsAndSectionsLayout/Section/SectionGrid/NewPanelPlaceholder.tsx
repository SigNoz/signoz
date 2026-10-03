import { useRef } from 'react';

import { getPanelDefinition } from '../../../Panels/registry';
import type { PanelKind } from '../../../Panels/types/panelKind';
import { usePanelPickerReveal } from '../hooks/usePanelPickerReveal';

import styles from './NewPanelPlaceholder.module.scss';

function NewPanelPlaceholder({ kind }: { kind: PanelKind }): JSX.Element {
	const ref = useRef<HTMLDivElement>(null);
	usePanelPickerReveal(ref, true);

	return (
		<div
			ref={ref}
			className={styles.placeholder}
			data-testid="new-panel-placeholder"
		>
			<span className={styles.name}>{getPanelDefinition(kind).displayName}</span>
			<span className={styles.label}>New panel</span>
		</div>
	);
}

export default NewPanelPlaceholder;
