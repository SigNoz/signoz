import { useEffect, useMemo, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Drawer } from '@signozhq/ui/drawer';

import { useDashboardSections } from '../../../hooks/useDashboardSections';
import { releasePanelPickerTarget } from '../../../store/usePanelPickerTargetStore';
import type { NewPanelTarget } from '../../../patchOps';
import type { PanelKind } from '../../../Panels/types/panelKind';
import AddPanelSplitButton from './components/AddPanelSplitButton/AddPanelSplitButton';
import NewSectionNameInput from './components/NewSectionNameInput/NewSectionNameInput';
import PanelTypeBrowser from './components/PanelTypeBrowser/PanelTypeBrowser';
import { usePanelPickerDraftSection } from './hooks/usePanelPickerDraftSection';
import { usePanelPickerTarget } from './hooks/usePanelPickerTarget';
import { buildSectionOptions, resolveDefaultSectionValue } from './utils';

const DEFAULT_PANEL_KIND: PanelKind = 'signoz/TimeSeriesPanel';

interface PanelTypeSelectionModalProps {
	open: boolean;
	onClose: () => void;
	onSelect: (panelKind: PanelKind, target?: NewPanelTarget) => void;
	/** Section the picker opens on; omit → the first section. */
	defaultLayoutIndex?: number;
}

function PanelTypeSelectionModal({
	open,
	onClose,
	onSelect,
	defaultLayoutIndex,
}: PanelTypeSelectionModalProps): JSX.Element {
	const sections = useDashboardSections();
	const options = useMemo(() => buildSectionOptions(sections), [sections]);
	const hasSectionPicker = options.length > 1;

	const [selectedValue, setSelectedValue] = useState('');
	const [selectedKind, setSelectedKind] =
		useState<PanelKind>(DEFAULT_PANEL_KIND);
	const [newSectionTitle, setNewSectionTitle] = useState<string | null>(null);
	const isCreatingSection = newSectionTitle !== null;

	useEffect(() => {
		if (open) {
			setSelectedValue(resolveDefaultSectionValue(options, defaultLayoutIndex));
			setSelectedKind(DEFAULT_PANEL_KIND);
			setNewSectionTitle(null);
		}
	}, [open, options, defaultLayoutIndex]);

	const selectedOption = options.find((o) => o.value === selectedValue);
	const selectedTarget = selectedOption?.target;
	const selectedLayoutIndex =
		selectedTarget?.type === 'section' ? selectedTarget.layoutIndex : undefined;
	usePanelPickerTarget({
		open: open && !isCreatingSection,
		layoutIndex: selectedLayoutIndex,
		panelKind: selectedKind,
		outline: hasSectionPicker,
	});
	usePanelPickerDraftSection(newSectionTitle, selectedKind, open);

	const handleClose = (): void => {
		releasePanelPickerTarget(true);
		onClose();
	};

	const sectionTitle = newSectionTitle?.trim() ?? '';

	const handleConfirm = (): void => {
		if (isCreatingSection && !sectionTitle) {
			return;
		}
		releasePanelPickerTarget(false);
		onSelect(
			selectedKind,
			isCreatingSection
				? { type: 'newSection', title: sectionTitle }
				: selectedTarget,
		);
	};

	const handleSectionChange = (value: string): void => {
		setSelectedValue(value);
		setNewSectionTitle(null);
	};

	let confirmLabel = 'Add panel';
	if (isCreatingSection) {
		confirmLabel = 'Add to new section';
	} else if (hasSectionPicker && selectedOption) {
		confirmLabel = `Add to ${selectedOption.label}`;
	}

	return (
		<Drawer
			type="task"
			open={open}
			onClose={handleClose}
			title="New panel"
			description="Pick a visualization. You can change it later."
			width="wide"
			testId="panel-type-drawer"
			footerSuffix={
				<>
					{isCreatingSection && (
						<NewSectionNameInput
							value={newSectionTitle}
							onChange={setNewSectionTitle}
							onCancel={(): void => setNewSectionTitle(null)}
							onSubmit={handleConfirm}
						/>
					)}
					<Button
						variant="outlined"
						color="secondary"
						size="md"
						onClick={handleClose}
					>
						Cancel
					</Button>
					<AddPanelSplitButton
						label={confirmLabel}
						options={options}
						value={isCreatingSection ? null : selectedValue}
						onChange={handleSectionChange}
						onCreate={(): void => setNewSectionTitle('')}
						onConfirm={handleConfirm}
						disabled={isCreatingSection && !sectionTitle}
					/>
				</>
			}
		>
			<PanelTypeBrowser selectedKind={selectedKind} onSelect={setSelectedKind} />
		</Drawer>
	);
}

export default PanelTypeSelectionModal;
