import { useMemo } from 'react';
import { SolidInfoCircle } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
// eslint-disable-next-line signoz/no-antd-components -- lightweight description tooltip, matches V1
import { Tooltip } from 'antd';
import { textContainsVariableReference } from 'lib/dashboardVariables/variableReference';

import type { VariableFormModel } from '../DashboardSettings/Variables/variableFormModel';
import type { VariableSelection, VariableSelectionMap } from './selectionTypes';
import TextSelector from './selectors/TextSelector';
import VariableValueControl from './selectors/VariableValueControl';
import { useVariableFetchState } from './useVariableFetchState';
import styles from './VariablesBar.module.scss';
import VariableTooltip from './VariableTooltip';

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
	// references (dependsOn) and query variables that reference this one (usedBy).
	const { dependsOn, usedBy } = useMemo(() => {
		const references = (text: string | undefined, name: string): boolean =>
			!!text && !!name && textContainsVariableReference(text, name);
		return {
			dependsOn:
				variable.type === 'QUERY'
					? variables
							.filter(
								(v) =>
									v.name !== variable.name && references(variable.queryValue, v.name),
							)
							.map((v) => v.name)
					: [],
			usedBy: variables
				.filter(
					(v) =>
						v.type === 'QUERY' &&
						v.name !== variable.name &&
						references(v.queryValue, variable.name),
				)
				.map((v) => v.name),
		};
	}, [variable, variables]);

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
				${variable.name}
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
						<SolidInfoCircle className={styles.infoIcon} size={14} />
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
