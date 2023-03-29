import { Select } from 'antd';
import { IOption } from 'container/FormAlertRules/labels/types';
import React, { useCallback, useEffect, useState } from 'react';

import { GetTagKeys } from './utils';

function SearchFilters(props: SearchFiltersProps): JSX.Element {
	const { dataSource, aggregateOperator, aggregateAttribute } = props;
	const [currentState, setCurrentState] = useState<string>('tagKey');
	const [optionsData, setOptionsData] = useState<IOption[]>([]);
	const [searchText, setSearchText] = useState<string>('');

	useEffect(() => {
		if (currentState === 'tagKey') {
			const payload = {
				searchText,
				dataSource,
				aggregateOperator,
				aggregateAttribute,
			};
			GetTagKeys(payload)
				.then((tagKeys) => setOptionsData(tagKeys))
				.catch(() => {
					console.log('false');
				});
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
	}, [
		aggregateAttribute,
		aggregateOperator,
		currentState,
		dataSource,
		searchText,
	]);

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

	const handleSearch = (e: React.SetStateAction<string>): void =>
		setSearchText(e);

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
			showSearch
			onSearch={handleSearch}
		/>
	);
}

interface SearchFiltersProps {
	dataSource: string;
	aggregateOperator: string;
	aggregateAttribute: string;
}
export default SearchFilters;
