import { EditFilled, TagOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import React from 'react';

const { Option } = Select;

function TextToIcon(text) {
	return <span>{text}</span>;
}
const OptionsSchemas = {
	categories: {
		mode: null,
		options: [
			{
				name: 'Tag',
				icon: <TagOutlined />,
			},
			{
				name: 'Tag2',
				icon: <TagOutlined />,
			},
			{
				name: 'Tag3',
				icon: <TagOutlined />,
			},
		],
	},
	operation: {
		mode: 'tags',
		options: [
			{
				name: 'Equal',
				icon: TextToIcon('='),
			},
			{
				name: 'Not Equal',
				icon: TextToIcon('!='),
			},
		],
	},
};
const children = [];
OptionsSchemas.categories.options.forEach((optionItem) => {
	const { name, icon: Icon } = optionItem;
	children.push(
		<Option key={name}>
			<span>{name}</span> {Icon}
		</Option>,
	);
});
function SearchFilter(): JSX.Element {
	function handleChange(value) {
		console.log(`selected ${value}`);
	}
	return (
		<div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
			<div>
				Selected Items
			</div>
			<Select
				// mode="tags"
				mode={null}
				style={{ flex: 1 }}
				onChange={handleChange}
				bordered={false}
				suffixIcon={null}
			>
				{children}
			</Select>
		</div>
	);
}

export default SearchFilter;
