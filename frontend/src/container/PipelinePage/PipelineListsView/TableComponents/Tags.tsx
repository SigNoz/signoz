import { Tag } from 'antd';
import React from 'react';

import { PipelineColumn } from '../types';

function Tags({ tags }: TagsProps): React.ReactElement {
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
