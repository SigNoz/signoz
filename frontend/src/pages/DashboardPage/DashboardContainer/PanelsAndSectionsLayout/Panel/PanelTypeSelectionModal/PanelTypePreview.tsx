import type { PanelKind } from '../../../Panels/types/panelKind';
import { PANEL_TYPE_PREVIEWS } from './panelTypePreviews';

import styles from './PanelTypePreview.module.scss';

function PanelTypePreview({ kind }: { kind: PanelKind }): JSX.Element {
	return (
		<div className={styles.preview} aria-hidden>
			{PANEL_TYPE_PREVIEWS[kind]}
		</div>
	);
}

export default PanelTypePreview;
