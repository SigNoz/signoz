/* eslint-disable react/destructuring-assignment */
import { Tag } from 'antd';

import { Data } from '../DashboardsList';

function Tags(data: Data['tags']): JSX.Element {
	return (
		<>
			{data.map((e) => (
				<Tag key={e}>{e}</Tag>
			))}
		</>
	);
}

export default Tags;
