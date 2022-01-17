import React, { useState } from 'react';
import { Space, Select, SelectProps, Input, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Container } from './styles';
import useDebouncedFunction from 'hooks/useDebouncedFunction';

interface ItemProps {
	label: string;
	value: string;
}

const Search = () => {
	const [value, setValue] = useState<string[]>([]);
	const [loading, setLoading] = useState<boolean>(false);

	const options: ItemProps[] = [];

	const onChangeHandler = (search: string) => {
		// make a ajax call and update the setValue
		console.log(search, setValue, setLoading);
	};

	const onDebounceChangeHandler = useDebouncedFunction(onChangeHandler, 300);

	const selectProps: SelectProps<string[]> = {
		mode: 'multiple' as const,
		value,
		options,
		style: { width: '100%' },
		onChange: (updatedValue) => {
			console.log(updatedValue, 'asd');
		},
		onSearch: onDebounceChangeHandler,
		placeholder: 'Select Item...',
		maxTagCount: 'responsive' as const,
		loading,
	};

	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<Container>
				<Select {...selectProps} />
				<Button type="primary">
					<SearchOutlined />
				</Button>
			</Container>
		</Space>
	);
};

export default Search;
