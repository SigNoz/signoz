import './FieldRenderer.styles.scss';

import { Divider } from 'antd';

import { TagContainer, TagLabel, TagValue } from './FieldRenderer.styles';
import { FieldRendererProps } from './LogDetailedView.types';
import { getFieldAttributes } from './utils';

function FieldRenderer({ field }: FieldRendererProps): JSX.Element {
	const { dataType, newField, logType } = getFieldAttributes(field);

	return (
		<span className="field-renderer-container">
			{dataType && newField && logType ? (
				<>
					<div className="label">{newField} </div>
					<TagContainer>
						<TagLabel>
							type
							<Divider type="vertical" />{' '}
						</TagLabel>
						<TagValue>{logType}</TagValue>
					</TagContainer>
					<TagContainer>
						<TagLabel>
							data type <Divider type="vertical" />{' '}
						</TagLabel>
						<TagValue>{dataType}</TagValue>
					</TagContainer>
				</>
			) : (
				<span className="label">{field}</span>
			)}
		</span>
	);
}

export default FieldRenderer;
