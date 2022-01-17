import React, { useState } from 'react';

import { Button, Space, Typography } from 'antd';
import { PlayCircleFilled } from '@ant-design/icons';

import { Container, ButtonContainer, CurrentTagsContainer } from './styles';
import Tags from './Tag';
const { Text } = Typography;
import { PlusCircleOutlined } from '@ant-design/icons';

const AllTags = (): JSX.Element => {
	const [currentTags, setCurrentTags] = useState<Tags[]>([
		{
			filters: ['first', 'second'],
			name: ['asd'],
			selectedFilter: 'IN',
		},
	]);

	const onTagAddHandler = () => {
		setCurrentTags((tags) => [
			...tags,
			{
				filters: [],
				name: [''],
				selectedFilter: 'IN',
			},
		]);
	};

	const onCloseHandler = (index: number) => {
		setCurrentTags([
			...currentTags.slice(0, index),
			...currentTags.slice(currentTags.length),
		]);
	};

	const onRunQueryHandler = () => {
		console.log('asd');
	};

	return (
		<Container>
			<CurrentTagsContainer>
				{currentTags.map((tags, index) => (
					<Tags
						key={index}
						{...{
							...tags,
						}}
						index={index}
						onCloseHandler={() => onCloseHandler(index)}
					/>
				))}
			</CurrentTagsContainer>

			<Space wrap direction="horizontal">
				<Button onClick={onTagAddHandler} icon={<PlusCircleOutlined />}>
					Add Tags Filter
				</Button>

				<Text ellipsis>
					Results will include spans with ALL the specified tags ( Rows are `anded` )
				</Text>
			</Space>

			<ButtonContainer>
				<Button>Reset</Button>
				<Button onClick={onRunQueryHandler} icon={<PlayCircleFilled />}>
					Run Query
				</Button>
			</ButtonContainer>
		</Container>
	);
};

export interface Tags {
	filters: string[];
	selectedFilter: 'NOT_IN' | 'IN';
	name: string[];
}

export default AllTags;
