import { blue } from '@ant-design/colors';
import { Color } from '@signozhq/design-tokens';
import { Col, Row, Space } from 'antd';
import styled from 'styled-components';
import {
	getActiveLogBackground,
	getDefaultLogBackground,
	getHightLightedLogBackground,
} from 'utils/logs';

import { RawLogContentProps } from './types';

export const RawLogViewContainer = styled(Row)<{
	$isDarkMode: boolean;
	$isReadOnly?: boolean;
	$isActiveLog?: boolean;
	$isHightlightedLog: boolean;
}>`
	position: relative;
	width: 100%;

	display: flex;
	alignitems: center;

	transition: background-color 0.2s ease-in;

	${({ $isActiveLog }): string => getActiveLogBackground($isActiveLog)}
	${({ $isHightlightedLog }): string =>
		getHightLightedLogBackground($isHightlightedLog)}

	${({ $isReadOnly, $isActiveLog, $isDarkMode }): string =>
		$isActiveLog
			? getActiveLogBackground($isActiveLog, $isDarkMode)
			: getDefaultLogBackground($isReadOnly)}
`;

export const ExpandIconWrapper = styled(Col)`
	color: ${blue[6]};
	padding: 0.25rem 0.375rem;
	cursor: pointer;
`;

export const RawLogContent = styled.div<RawLogContentProps>`
	margin-bottom: 0;
	font-family: 'SF Mono', monospace;
	font-size: 14px;
	font-weight: 400;
	text-align: left;
	color: ${({ $isDarkMode }): string =>
		$isDarkMode ? Color.BG_VANILLA_400 : Color.BG_INK_400};

	${({ $isTextOverflowEllipsisDisabled, linesPerRow }): string =>
		$isTextOverflowEllipsisDisabled
			? 'white-space: nowrap'
			: `overflow: hidden;
		text-overflow: ellipsis; 
		display: -webkit-box;
		-webkit-line-clamp: ${linesPerRow};
		line-clamp: ${linesPerRow}; 
		-webkit-box-orient: vertical;`};

	line-height: 24px;
	letter-spacing: -0.07px;
	padding: 4px;

	cursor: ${({ $isActiveLog, $isReadOnly }): string =>
		$isActiveLog || $isReadOnly ? 'initial' : 'pointer'};
`;

export const ActionButtonsWrapper = styled(Space)`
	position: absolute;
	transform: translate(-50%, -50%);
	top: 50%;
	right: 0;
	cursor: pointer;
`;
