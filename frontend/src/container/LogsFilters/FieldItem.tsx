import {
	CloseCircleFilled,
	CloseOutlined,
	LoadingOutlined,
} from '@ant-design/icons';
import { Button, Popover, Spin } from 'antd';
import Spinner from 'components/Spinner';
import React, { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHover, useHoverDirty } from 'react-use';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { Field } from './styles';

export function FieldItem({
	name,
	buttonIcon,
	buttonOnClick,
	fieldData,
	fieldIndex,
	isLoading,
	iconHoverText
}) {
	const [isHovered, setIsHovered] = useState(false);
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	return (
		<Field
			onMouseEnter={() => {
				setIsHovered(true);
			}}
			onMouseLeave={() => setIsHovered(false)}
			isDarkMode={isDarkMode}
		>
			<span>{name}</span>
			{isLoading ? (
				<Spin spinning size="small" indicator={<LoadingOutlined spin />} />
			) : (
				isHovered &&
				buttonOnClick && (
					<Popover content={<span>{iconHoverText}</span>}>
						<Button
							type="text"
							size="small"
							icon={buttonIcon}
							onClick={() => buttonOnClick({ fieldData, fieldIndex })}
							style={{ color: 'inherit', padding: 0, height: '1rem', width: '1rem' }}
						/>
					</Popover>
				)
			)}
		</Field>
	);
}
