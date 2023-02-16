import { Tag } from 'antd';
import React from 'react';

import { PipelineColumn } from '..';

function Tags({ tags }: { tags: PipelineColumn['tags'] }): React.ReactElement {
	return (
		<span>
			{tags?.map((tag: string) => (
				<Tag color="magenta" key={tag}>
					{tag}
				</Tag>
			))}
		</span>
	);
}

export default Tags;
