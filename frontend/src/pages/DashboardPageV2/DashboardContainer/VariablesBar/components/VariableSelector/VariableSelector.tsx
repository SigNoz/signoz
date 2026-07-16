import { useMemo } from 'react';
import { SolidInfoCircle } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
// eslint-disable-next-line signoz/no-antd-components -- lightweight description tooltip, matches V1
import { Tooltip } from 'antd';

import type { VariableFormModel } from '../../../DashboardSettings/Variables/variableFormModel';
import type {
	VariableSelection,
	VariableSelectionMap,
} from '../../selectionTypes';
import { computeVariableDependencies } from '../../utils/variableDependencies';
import TextSelector from '../selectors/TextSelector';
import VariableValueControl from '../selectors/VariableValueControl';
import { useVariableFetchState } from '../../hooks/useVariableFetchState';
import styles from './VariableSelector.module.scss';
import VariableTooltip from '../VariableTooltip/VariableTooltip';

interface VariableSelectorProps {
	variable: VariableFormModel;
	/** All variables (Dynamic uses them to scope options by sibling selections). */
	variables: VariableFormModel[];
	/** All current selections (Query passes them as the request payload). */
	selections: VariableSelectionMap;
	selection: VariableSelection;
	onChange: (selection: VariableSelection) => void;
	/** Batched fill applied when options resolve (Query/Dynamic/Custom auto-selection). */
	onAutoSelect: (selection: VariableSelection) => void;
}

/** One labelled variable control; dispatches on the variable type. */
function VariableSelector({
	variable,
	variables,
	selections,
	selection,
	onChange,
	onAutoSelect,
}: VariableSelectorProps): JSX.Element {
	// Dependency links shown in the hover tooltip: variables this one's query
	// references (dependsOn = its parents) and query variables that reference this
	// one (usedBy = its children), from the shared dependency graph.
	const { dependsOn, usedBy } = useMemo(() => {
		const { graph, parentGraph } = computeVariableDependencies(variables);
		return {
			dependsOn: parentGraph[variable.name] ?? [],
			usedBy: graph[variable.name] ?? [],
		};
	}, [variable.name, variables]);

	const hasTooltip =
		!!variable.description || dependsOn.length > 0 || usedBy.length > 0;

	// Surface the fetch on the bar itself: a bar flush along the control's bottom
	// edge while a QUERY/DYNAMIC variable is loading (or waiting on a parent), so the
	// user sees options are being fetched without opening the dropdown.
	const { isVariableFetching, isVariableWaiting } = useVariableFetchState(
		variable.name,
	);
	const isFetchingOptions =
		(variable.type === 'QUERY' || variable.type === 'DYNAMIC') &&
		(isVariableFetching || isVariableWaiting);

	const renderControl = (): JSX.Element =>
		variable.type === 'TEXT' ? (
			<TextSelector
				selection={selection}
				defaultValue={variable.textValue}
				onChange={onChange}
				testId={`variable-input-${variable.name}`}
			/>
		) : (
			<VariableValueControl
				variable={variable}
				variables={variables}
				selections={selections}
				selection={selection}
				onChange={onChange}
				onAutoSelect={onAutoSelect}
			/>
		);

	return (
		<div
			className={styles.variableItem}
			data-testid={`variable-${variable.name}`}
		>
			<Typography.Text className={styles.variableName}>
				<span className={styles.name} title={`$${variable.name}`}>
					${variable.name}
				</span>
				{hasTooltip ? (
					<Tooltip
						title={
							<VariableTooltip
								description={variable.description}
								dependsOn={dependsOn}
								usedBy={usedBy}
							/>
						}
					>
						<SolidInfoCircle className={styles.infoIcon} size={12} />
					</Tooltip>
				) : null}
			</Typography.Text>

			<div className={styles.variableValue}>{renderControl()}</div>

			{isFetchingOptions ? (
				<span
					className={styles.loadingBar}
					data-testid={`variable-loading-${variable.name}`}
				/>
			) : null}
		</div>
	);
}

export default VariableSelector;
