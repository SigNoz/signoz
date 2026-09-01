import { useCallback, useMemo } from 'react';
import MarkdownEditor from 'components/MarkdownEditor/MarkdownEditor';
import type { EditorVariable } from 'components/MarkdownEditor/types';
import { dtoToFormModel } from 'pages/DashboardPage/DashboardContainer/DashboardSettings/Variables/variableAdapters';
import { useDashboardFetchRequired } from 'pages/DashboardPage/DashboardContainer/hooks/useDashboardFetchRequired';

import type { StaticEditorPaneProps } from '../../types/panelDefinition';
import type {
	DashboardtypesPanelSpecDTO,
	DashboardtypesTextPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';

import styles from './EditorPane.module.scss';

/**
 * The Text panel's authoring pane — the Markdown source editor in the slot where
 * query-backed kinds show the query builder. The preview above renders the draft
 * spec, so it updates live as the body changes; there is no Run step.
 */
function EditorPane({
	spec,
	onChangeSpec,
}: StaticEditorPaneProps): JSX.Element {
	// The plugin-spec union can't be narrowed by a dynamic kind; one localized cast,
	// as in the section registry's lenses.
	const pluginSpec = spec.plugin.spec as DashboardtypesTextPanelSpecDTO;

	const { variables: variableDtos } = useDashboardFetchRequired();
	const variables = useMemo(
		() =>
			variableDtos
				.map((dto) => dtoToFormModel(dto))
				.flatMap((model): EditorVariable[] =>
					model.name ? [{ name: model.name, badge: model.type }] : [],
				),
		[variableDtos],
	);

	const onChangeText = useCallback(
		(text: string): void => {
			// Written back through the same cast: `plugin` is the kind-discriminated
			// union, and TS resolves a bare object literal against the wrong arm.
			const nextPluginSpec: DashboardtypesTextPanelSpecDTO = {
				...pluginSpec,
				text,
			};
			onChangeSpec({
				...spec,
				plugin: {
					...spec.plugin,
					spec: nextPluginSpec,
				} as DashboardtypesPanelSpecDTO['plugin'],
			});
		},
		[spec, pluginSpec, onChangeSpec],
	);

	return (
		<div className={styles.pane} data-testid="text-panel-editor-pane">
			<MarkdownEditor
				value={pluginSpec.text ?? ''}
				onChange={onChangeText}
				variables={variables}
				statusHint="Preview updates as you type"
			/>
		</div>
	);
}

export default EditorPane;
