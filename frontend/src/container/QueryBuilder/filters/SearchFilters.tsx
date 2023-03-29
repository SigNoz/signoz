import { Select } from 'antd';
import { IOption } from 'container/MetricsApplication/ResourceAttributesFilter/types';
import React, { useCallback, useEffect, useState } from 'react';

function SearchFilters(): JSX.Element {
	const [currentState, setCurrentState] = useState<string>('tagKey');
	const [optionsData, setOptionsData] = useState<IOption[]>([]);

	useEffect(() => {
		if (currentState === 'tagKey') {
			setOptionsData([
				{ value: 'jack', label: 'Jack' },
				{ value: 'lucy', label: 'Lucy' },
				{ value: 'Yiminghe', label: 'yiminghe' },
				{ value: 'disabled', label: 'Disabled' },
			]);
		}
		if (currentState === 'tagOperator') {
			setOptionsData([
				{ value: '=', label: '=' },
				{ value: '!=', label: '!=' },
				{ value: '>', label: '>' },
				{ value: '<', label: '<' },
			]);
		}
		if (currentState === 'tagValue') {
			setOptionsData([
				{ value: '12', label: '12' },
				{ value: '34', label: '34' },
				{ value: '10', label: '10' },
				{ value: '14', label: '14' },
			]);
		}
	}, [currentState]);

	const handleChange = useCallback(
		(value: string[]): void => {
			console.log(`selected ${value}`);
			if (currentState === 'tagKey') {
				setCurrentState('tagOperator');
			}
			if (currentState === 'tagOperator') {
				setCurrentState('tagValue');
			}
			if (currentState === 'tagValues') {
				setCurrentState('');
			}
		},
		[currentState],
	);

	return (
		<Select
			allowClear
			placeholder="Type your Query"
			onChange={handleChange}
			style={{ width: '100%' }}
			mode="tags"
			showArrow={false}
			optionLabelProp="label"
			options={optionsData}
		/>
	);
}

export default SearchFilters;
