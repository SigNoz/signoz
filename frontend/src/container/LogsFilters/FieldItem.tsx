import {
	CloseCircleFilled,
	CloseOutlined,
	LoadingOutlined,
} from '@ant-design/icons';
import { Button, Spin } from 'antd';
import Spinner from 'components/Spinner';
import React, { useRef, useState } from 'react';
import { useHover, useHoverDirty } from 'react-use';

import { Field } from './styles';

export function FieldItem({
	name,
	buttonIcon,
	buttonOnClick,
	fieldData,
	fieldIndex,
	isLoading,
}) {
	const [isHovered, setIsHovered] = useState(false);
	return (
		<Field
			onMouseEnter={() => {
				setIsHovered(true);
			}}
			onMouseLeave={() => setIsHovered(false)}
		>
			<span>{name}</span>
			{isLoading ? (
				<Spin spinning size="small" indicator={<LoadingOutlined spin />} />
			) : (
				isHovered &&
				buttonOnClick && (
					<Button
						type="text"
						size="small"
						icon={buttonIcon}
						onClick={() => buttonOnClick({ fieldData, fieldIndex })}
						style={{ color: 'inherit', padding: 0, height: '1rem', width: '1rem' }}
					/>
				)
			)}
		</Field>
	);
}
