import { Input } from 'antd';
import React from 'react';
import { IMetricsBuilderFormula } from 'types/api/dashboard/getAll';

import QueryHeader from '../QueryHeader';
import { IQueryBuilderFormulaHandleChange } from './types';

const { TextArea } = Input;

interface IMetricsBuilderFormulaProps {
	formulaData: IMetricsBuilderFormula;
	formulaIndex: number | string;
	handleFormulaChange: (args: IQueryBuilderFormulaHandleChange) => void;
}
function MetricsBuilderFormula({
	formulaData,
	formulaIndex,
	handleFormulaChange,
}: IMetricsBuilderFormulaProps): JSX.Element {
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
