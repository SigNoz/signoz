import { Tag } from 'antd';
import React from 'react';

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
	tags: Array<string>;
}

export default Tags;
