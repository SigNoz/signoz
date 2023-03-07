import { Tag } from 'antd';
import React from 'react';

import { PipelineColumn } from '../types';

function Tags({ tags }: TagsProps): JSX.Element {
	return (
		<span>
			{tags?.map((tag) => (
				<Tag color="magenta" key={tag}>
					{tag}
				</Tag>
			))}
		</span>
	);
}

interface TagsProps {
	tags: PipelineColumn['tags'];
}

export default Tags;
