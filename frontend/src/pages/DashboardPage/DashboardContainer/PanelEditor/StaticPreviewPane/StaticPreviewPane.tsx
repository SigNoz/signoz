import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelMode } from 'lib/visualization/panels/types';
import PanelHeader from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader';
import StaticPanelBody from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/StaticPanelBody/StaticPanelBody';

import { useTextBackground } from '../../Panels/hooks/useTextBackground';
import type { RenderableStaticPanelDefinition } from '../../Panels/types/panelDefinition';
import { isPanelHeaderHidden } from '../../Panels/utils/isPanelHeaderHidden';
import styles from './StaticPreviewPane.module.scss';

interface StaticPreviewPaneProps {
	panelId: string;
	panel: DashboardtypesPanelDTO;
	panelDefinition: RenderableStaticPanelDefinition;
	panelMode: PanelMode;
	/** Saves an edit made from the rendered body into the draft; absent = read-only. */
	onChangeText?: (text: string) => void;
}

/**
 * Live preview of a static draft: the panel card rendered through the same
 * `StaticPanelBody` the grid uses, on the query preview's dotted canvas. It
 * re-renders from the draft spec on every edit — no query, no Run step. Shared
 * by the full editor and the View modal.
 */
function StaticPreviewPane({
	panelId,
	panel,
	panelDefinition,
	panelMode,
	onChangeText,
}: StaticPreviewPaneProps): JSX.Element {
	const background = useTextBackground(panel.spec);

	return (
		<div className={styles.preview}>
			<div className={styles.surface} style={background.style}>
				{!isPanelHeaderHidden(panel.spec) && (
					<PanelHeader mode="static" panelId={panelId} panel={panel} hideActions />
				)}
				<StaticPanelBody
					Renderer={panelDefinition.Renderer}
					panel={panel}
					panelId={panelId}
					panelMode={panelMode}
					onChangeText={onChangeText}
				/>
			</div>
		</div>
	);
}

export default StaticPreviewPane;
