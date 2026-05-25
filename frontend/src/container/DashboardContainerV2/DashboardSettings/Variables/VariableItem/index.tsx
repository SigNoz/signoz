import { useCallback, useMemo, useState } from 'react';
import { Button } from 'antd';
import { ArrowLeft } from '@signozhq/icons';
import { commaValuesParser } from 'lib/dashboardVariables/customCommaValuesParser';

import { draftToVariableDTO, validateDraft } from '../draft';
import type { SaveCallback, VariableDraft, V2VariableKind } from '../types';
import CustomFields from './CustomFields';
import DynamicFields from './DynamicFields';
import Footer from './Footer';
import ListBasicOptions from './ListBasicOptions';
import NameDisplay from './NameDisplay';
import PreviewValues from './PreviewValues';
import QueryFields from './QueryFields';
import TextFields from './TextFields';
import TypeSelector from './TypeSelector';

import '../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/VariableItem.styles.scss';

interface Props {
	initialDraft: VariableDraft;
	existingNames: string[];
	saving: boolean;
	onSave: SaveCallback;
	onCancel: () => void;
}

/**
 * Editor for a single V2 variable.
 *
 * Type-switch contract: changing `kind` does NOT clear the per-kind fields
 * the user already typed. They remain in local state and are restored if the
 * user navigates back to the same kind. Only the fields relevant to the
 * active `kind` are written into the V2 envelope on save (see
 * `draftToVariableDTO`).
 */
function VariableItem({
	initialDraft,
	existingNames,
	saving,
	onSave,
	onCancel,
}: Props): JSX.Element {
	const [draft, setDraft] = useState<VariableDraft>(initialDraft);

	const update = useCallback(
		<K extends keyof VariableDraft>(key: K, value: VariableDraft[K]): void => {
			setDraft((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	const onKindChange = useCallback(
		(kind: V2VariableKind): void => {
			// Retain every other field — only the discriminator changes.
			update('kind', kind);
		},
		[update],
	);

	const namesExcludingSelf = useMemo(
		() => existingNames.filter((n) => n !== initialDraft.name),
		[existingNames, initialDraft.name],
	);
	const validationError = useMemo(
		() => validateDraft(draft, namesExcludingSelf),
		[draft, namesExcludingSelf],
	);

	// Local preview values — currently populated only for CUSTOM (CSV parse).
	// Query / Dynamic previews are wired in the variable execution subsystem.
	const previewValues = useMemo<string[]>(() => {
		if (draft.kind === 'CUSTOM') {
			return commaValuesParser(draft.customValue).map((v) => String(v));
		}
		return [];
	}, [draft.kind, draft.customValue]);

	const handleSave = useCallback((): void => {
		if (validationError) return;
		onSave(draftToVariableDTO(draft));
	}, [draft, validationError, onSave]);

	const errorFor = (
		field: NonNullable<typeof validationError>['field'],
	): string | undefined => {
		if (validationError && validationError.field === field) {
			return validationError.message;
		}
		return undefined;
	};

	const showListOptions =
		draft.kind === 'QUERY' || draft.kind === 'CUSTOM' || draft.kind === 'DYNAMIC';

	return (
		<>
			<div className="variable-item-container">
				<div className="all-variables">
					<Button
						type="text"
						className="all-variables-btn"
						icon={<ArrowLeft size={14} />}
						onClick={onCancel}
					>
						All variables
					</Button>
				</div>
				<div className="variable-item-content">
					<NameDisplay
						name={draft.name}
						description={draft.displayName}
						onNameChange={(v): void => update('name', v)}
						onDescriptionChange={(v): void => update('displayName', v)}
						nameError={errorFor('name')}
					/>

					<TypeSelector kind={draft.kind} onChange={onKindChange} />

					{draft.kind === 'DYNAMIC' ? (
						<DynamicFields
							dynamicName={draft.dynamicName}
							dynamicSignal={draft.dynamicSignal}
							onNameChange={(v): void => update('dynamicName', v)}
							onSignalChange={(v): void => update('dynamicSignal', v)}
							error={errorFor('dynamicName')}
						/>
					) : null}
					{draft.kind === 'QUERY' ? (
						<QueryFields
							queryValue={draft.queryValue}
							onChange={(v): void => update('queryValue', v)}
							error={errorFor('queryValue')}
						/>
					) : null}
					{draft.kind === 'CUSTOM' ? (
						<CustomFields
							customValue={draft.customValue}
							onChange={(v): void => update('customValue', v)}
							error={errorFor('customValue')}
						/>
					) : null}
					{draft.kind === 'TEXT' ? (
						<TextFields
							textValue={draft.textValue}
							onChange={(v): void => update('textValue', v)}
							error={errorFor('textValue')}
						/>
					) : null}

					{showListOptions ? (
						<>
							<PreviewValues previewValues={previewValues} />
							<ListBasicOptions
								kind={draft.kind}
								allowAllValue={draft.allowAllValue}
								allowMultiple={draft.allowMultiple}
								sort={draft.sort}
								defaultValue={draft.defaultValue}
								customAllValue={draft.customAllValue}
								capturingRegexp={draft.capturingRegexp}
								previewValues={previewValues}
								onAllowAllChange={(v): void => update('allowAllValue', v)}
								onAllowMultipleChange={(v): void => update('allowMultiple', v)}
								onSortChange={(v): void => update('sort', v)}
								onDefaultValueChange={(v): void => update('defaultValue', v)}
								onCustomAllValueChange={(v): void =>
									update('customAllValue', v)
								}
								onCapturingRegexpChange={(v): void =>
									update('capturingRegexp', v)
								}
							/>
						</>
					) : null}
				</div>
			</div>
			<Footer
				saving={saving}
				canSave={!validationError}
				onSave={handleSave}
				onCancel={onCancel}
			/>
		</>
	);
}

export default VariableItem;
