import { Input } from 'antd';
import React from 'react';

import QueryHeader from '../QueryHeader';

const { TextArea } = Input;

function MetricsBuilderFormula({
	formulaData,
	formulaIndex,
	handleFormulaChange,
}): JSX.Element {
	return (
		<QueryHeader
			name={formulaData.name}
			disabled={formulaData.disabled}
			onDisable={(): void =>
				handleFormulaChange({ formulaIndex, toggleDisable: true })
			}
			onDelete={(): void => {
				handleFormulaChange({ formulaIndex, toggleDelete: true });
			}}
		>
			<TextArea
				onChange={(event): void =>
					handleFormulaChange({ formulaIndex, expression: event.target.value })
				}
				size="middle"
				defaultValue={formulaData.expression}
				style={{ marginBottom: '0.5rem' }}
				rows={2}
			/>
		</QueryHeader>
	);
}

export default MetricsBuilderFormula;
