import { useCallback, useState } from 'react';
import { ArrowRightLeft, Undo2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { EQueryType } from 'types/common/dashboard';

import PanelTypeBrowser from '../../../PanelsAndSectionsLayout/Panel/PanelTypeSelectionModal/PanelTypeBrowser';
import { getPanelDefinition } from '../../../Panels/registry';
import type { PanelKind } from '../../../Panels/types/panelKind';
import ConfigField from '../controls/ConfigField/ConfigField';

import styles from './PanelTypeSwitcher.module.scss';
import { getPanelTypeDisabledReason } from './utils';

interface PanelTypeSwitcherProps {
	/** The current panel kind (selected value). */
	panelKind: PanelKind;
	/** Active query type — a kind that can't be authored in it is disabled (e.g. List is Query-Builder-only, so PromQL/ClickHouse disable it). */
	queryType: EQueryType;
	/** Panel's current signal — also gates the disabled rule (List needs logs/traces, not metrics). */
	signal?: TelemetrytypesSignalDTO;
	/** Kind the panel was opened with; a revert button appears once it differs. */
	originalPanelKind?: PanelKind;
	onChange: (kind: PanelKind) => void;
}

/**
 * Visualization-type selector (rendered inside the Visualization section): opens the
 * panel type browser in a drawer. A type is disabled when the active query type or
 * signal is incompatible with it — resolved through the capabilities guard.
 */
function PanelTypeSwitcher({
	panelKind,
	queryType,
	signal,
	originalPanelKind,
	onChange,
}: PanelTypeSwitcherProps): JSX.Element {
	const [isOpen, setIsOpen] = useState(false);
	const { displayName, icon: Icon } = getPanelDefinition(panelKind);

	const getDisabledReason = useCallback(
		(kind: PanelKind): string | undefined =>
			getPanelTypeDisabledReason({
				kind,
				queryType,
				signal,
				label: getPanelDefinition(kind).displayName,
			}),
		[queryType, signal],
	);

	const canRevert = !!originalPanelKind && originalPanelKind !== panelKind;
	const revertBlockedReason = canRevert
		? getDisabledReason(originalPanelKind)
		: undefined;

	const handleSelect = (kind: PanelKind): void => {
		setIsOpen(false);
		if (kind !== panelKind) {
			onChange(kind);
		}
	};

	return (
		<ConfigField label="Panel type">
			<button
				type="button"
				className={styles.trigger}
				onClick={(): void => setIsOpen(true)}
				data-testid="panel-editor-v2-type-switcher"
			>
				<Icon size={14} className={styles.triggerIcon} />
				<span className={styles.triggerName}>{displayName}</span>
				<span className={styles.triggerAction}>
					<ArrowRightLeft size={14} />
					Change
				</span>
			</button>
			{canRevert && (
				<Button
					variant="link"
					color="primary"
					size="sm"
					prefix={<Undo2 />}
					className={styles.revert}
					disabled={!!revertBlockedReason}
					title={revertBlockedReason}
					onClick={(): void => onChange(originalPanelKind)}
					testId="panel-editor-v2-type-revert"
				>
					Revert to {getPanelDefinition(originalPanelKind).displayName}
				</Button>
			)}
			<DrawerWrapper
				open={isOpen}
				onOpenChange={setIsOpen}
				title="Change panel type"
				subTitle="Pick a visualization for this panel."
				direction="right"
				width="wide"
				testId="panel-type-switcher-drawer"
				drawerDescriptionProps={{ className: styles.drawerBody }}
			>
				<PanelTypeBrowser
					selectedKind={panelKind}
					onSelect={handleSelect}
					getDisabledReason={getDisabledReason}
				/>
			</DrawerWrapper>
		</ConfigField>
	);
}

export default PanelTypeSwitcher;
