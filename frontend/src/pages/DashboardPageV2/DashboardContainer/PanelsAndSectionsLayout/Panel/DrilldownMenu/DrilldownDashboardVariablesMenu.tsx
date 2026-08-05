import { ArrowLeft, Plus, Settings, X } from '@signozhq/icons';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import {
	type DrilldownVariableAction,
	DrilldownVariableActionKind,
} from 'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/hooks/useDrilldownDashboardVariables';
import ContextMenu from 'periscope/components/ContextMenu';

import styles from './DrilldownDashboardVariablesMenu.module.scss';

interface DrilldownDashboardVariablesMenuProps {
	/** Resolved entries from `useDrilldownDashboardVariables`. */
	actions: DrilldownVariableAction[];
	/** Return to the base aggregate menu. */
	onBack: () => void;
}

const ICON_BY_KIND: Record<DrilldownVariableActionKind, JSX.Element> = {
	[DrilldownVariableActionKind.Set]: <Settings size={16} />,
	[DrilldownVariableActionKind.Unset]: <X size={16} />,
	[DrilldownVariableActionKind.Create]: <Plus size={16} />,
};

/**
 * The "Dashboard Variables" drilldown submenu — renders the entries resolved by
 * `useDrilldownDashboardVariables` (Set/Unset an existing dynamic variable, or Create one).
 */
function DrilldownDashboardVariablesMenu({
	actions,
	onBack,
}: DrilldownDashboardVariablesMenuProps): JSX.Element {
	return (
		<>
			<ContextMenu.Header>
				<div className={styles.header}>
					<ArrowLeft
						size={14}
						className={styles.backArrow}
						onClick={onBack}
						data-testid="drilldown-var-back"
					/>
					<span>Dashboard Variables</span>
				</div>
			</ContextMenu.Header>
			<OverlayScrollbar
				style={{ maxHeight: '200px' }}
				options={{ overflow: { x: 'hidden' } }}
			>
				<>
					{actions.map(({ fieldName, fieldValue, kind, onClick }) => (
						<ContextMenu.Item
							key={fieldName}
							icon={ICON_BY_KIND[kind]}
							onClick={onClick}
						>
							{kind === DrilldownVariableActionKind.Unset && (
								<span data-testid="drilldown-var-unset">
									Unset <strong>${fieldName}</strong>
								</span>
							)}
							{kind === DrilldownVariableActionKind.Set && (
								<span data-testid="drilldown-var-set">
									Set <strong>${fieldName}</strong> to <strong>{fieldValue}</strong>
								</span>
							)}
							{kind === DrilldownVariableActionKind.Create && (
								<span data-testid="drilldown-var-create">
									Create var <strong>${fieldName}</strong>:<strong>{fieldValue}</strong>
								</span>
							)}
						</ContextMenu.Item>
					))}
				</>
			</OverlayScrollbar>
		</>
	);
}

export default DrilldownDashboardVariablesMenu;
