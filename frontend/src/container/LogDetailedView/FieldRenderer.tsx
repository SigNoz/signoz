import { blue } from '@ant-design/colors';
import { Tag } from 'antd';

import { FieldRendererProps } from './LogDetailedView.types';
import { getFieldAttributes } from './utils';

function FieldRenderer({ field }: FieldRendererProps): JSX.Element {
	const { dataType, newField, logType } = getFieldAttributes(field);

	return (
		<span>
			{dataType && newField && logType ? (
				<>
					<span style={{ color: blue[4] }}>{newField} </span>
					<Tag>Type: {logType}</Tag>
					<Tag>Data type: {dataType}</Tag>
				</>
			) : (
				<span style={{ color: blue[4] }}>{field}</span>
			)}
		</span>
	);
}

export default FieldRenderer;
