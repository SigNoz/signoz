import { blue } from '@ant-design/colors';

import { TagContainer, TagLabel, TagValue } from './FieldRenderer.styles';
import { FieldRendererProps } from './LogDetailedView.types';
import { getFieldAttributes } from './utils';

function FieldRenderer({ field }: FieldRendererProps): JSX.Element {
	const { dataType, newField, logType } = getFieldAttributes(field);

	return (
		<span>
			{dataType && newField && logType ? (
				<>
					<span style={{ color: blue[4] }}>{newField} </span>
					<TagContainer>
						<TagLabel>Type: </TagLabel>
						<TagValue>{logType}</TagValue>
					</TagContainer>
					<TagContainer>
						<TagLabel>Data type: </TagLabel>
						<TagValue>{dataType}</TagValue>
					</TagContainer>
				</>
			) : (
				<span style={{ color: blue[4] }}>{field}</span>
			)}
		</span>
	);
}

export default FieldRenderer;
