import { CircleHelp } from '@signozhq/icons';

import PanelMessage from '../../components/PanelMessage/PanelMessage';
import PanelStyles from '../../panel.module.scss';

/**
 * Body for a panel whose kind this build has no renderer for — a spec written by a newer
 * SigNoz names a visualization that didn't exist when this client shipped. Says so in
 * place of the chart, so the panel keeps its slot in the layout instead of leaving a hole.
 */
function UnsupportedPanelRenderer(): JSX.Element {
	return (
		<div
			data-testid="unsupported-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			<PanelMessage
				icon={<CircleHelp size={18} />}
				title="Unsupported panel type"
				description="This panel was built with a newer version of SigNoz. Upgrade to view it."
			/>
		</div>
	);
}

export default UnsupportedPanelRenderer;
