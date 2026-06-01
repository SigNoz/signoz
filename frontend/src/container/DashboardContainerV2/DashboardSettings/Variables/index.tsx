import { useCallback, useMemo, useState } from 'react';
import { Button } from 'antd';
import { Plus } from '@signozhq/icons';
import { patchDashboardV2 } from 'api/generated/services/dashboard';
import type {
	DashboardtypesJSONPatchOperationDTO,
	DashboardtypesVariableDTO,
} from 'api/generated/services/sigNoz.schemas';
import { toast } from '@signozhq/ui/sonner';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import {
	buildDependencyMap,
	detectCycle,
} from '../../DashboardVariablesV2/dependencyGraph';
import type { V2Dashboard } from '../../utils';
import {
	emptyDraft,
	getVariableName,
	variableDTOToDraft,
} from './draft';
import type { VariableDraft } from './types';
import VariableItem from './VariableItem';
import VariableList from './VariableList';

interface Props {
	dashboard: V2Dashboard | undefined;
	onRefetch: () => void;
}

type EditorState =
	| { kind: 'closed' }
	| { kind: 'add'; draft: VariableDraft }
	| { kind: 'edit'; index: number; draft: VariableDraft };

function VariablesSettingsV2({ dashboard, onRefetch }: Props): JSX.Element {
	const dashboardId = dashboard?.id ?? '';
	const variables = useMemo<DashboardtypesVariableDTO[]>(
		() => dashboard?.spec?.variables ?? [],
		[dashboard?.spec?.variables],
	);

	const [editor, setEditor] = useState<EditorState>({ kind: 'closed' });
	const [saving, setSaving] = useState<boolean>(false);
	const { showErrorModal } = useErrorModal();

	const existingNames = useMemo(() => variables.map(getVariableName), [
		variables,
	]);

	const persistVariables = useCallback(
		async (next: DashboardtypesVariableDTO[]): Promise<void> => {
			if (!dashboardId) {return;}
			const cycle = detectCycle(buildDependencyMap(next));
			if (cycle.hasCycle) {
				toast.error(
					`Cyclic variable dependency: ${cycle.cycle?.join(' → ')}`,
				);
				return;
			}
			setSaving(true);
			try {
				const patch: DashboardtypesJSONPatchOperationDTO[] = [
					{
						op: 'replace' as DashboardtypesJSONPatchOperationDTO['op'],
						path: '/spec/variables',
						value: next,
					},
				];
				await patchDashboardV2({ id: dashboardId }, patch);
				toast.success('Variables updated');
				onRefetch();
				setEditor({ kind: 'closed' });
			} catch (error) {
				showErrorModal(error as APIError);
			} finally {
				setSaving(false);
			}
		},
		[dashboardId, onRefetch, showErrorModal],
	);

	const handleSave = useCallback(
		async (dto: DashboardtypesVariableDTO): Promise<void> => {
			if (editor.kind === 'add') {
				await persistVariables([...variables, dto]);
			} else if (editor.kind === 'edit') {
				const next = variables.slice();
				next[editor.index] = dto;
				await persistVariables(next);
			}
		},
		[editor, variables, persistVariables],
	);

	const handleDelete = useCallback(
		async (index: number): Promise<void> => {
			const next = variables.slice();
			next.splice(index, 1);
			await persistVariables(next);
		},
		[variables, persistVariables],
	);

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				padding: 16,
			}}
		>
			{editor.kind === 'closed' ? (
				<>
					<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
						<Button
							type="primary"
							icon={<Plus size={14} />}
							onClick={(): void =>
								setEditor({ kind: 'add', draft: emptyDraft() })
							}
							data-testid="add-variable-v2"
						>
							Add variable
						</Button>
					</div>
					<VariableList
						variables={variables}
						onEdit={(index): void =>
							setEditor({
								kind: 'edit',
								index,
								draft: variableDTOToDraft(variables[index]),
							})
						}
						onDelete={handleDelete}
						onReorder={persistVariables}
					/>
				</>
			) : (
				<VariableItem
					initialDraft={editor.draft}
					existingNames={existingNames}
					saving={saving}
					onSave={handleSave}
					onCancel={(): void => setEditor({ kind: 'closed' })}
				/>
			)}
		</div>
	);
}

export default VariablesSettingsV2;
