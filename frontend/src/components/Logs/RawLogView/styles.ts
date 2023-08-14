import { blue } from '@ant-design/colors';
import { Col, Row, Space } from 'antd';
import styled from 'styled-components';
import { getActiveLogBackground, getDefaultLogBackground } from 'utils/logs';

export const RawLogViewContainer = styled(Row)<{
	$isDarkMode: boolean;
	$isReadOnly: boolean;
	$isActiveLog: boolean;
}>`
	position: relative;
	width: 100%;
	font-weight: 700;
	font-size: 0.625rem;
	line-height: 1.25rem;

	transition: background-color 0.2s ease-in;

	${({ $isActiveLog }): string => getActiveLogBackground($isActiveLog)}

	${({ $isReadOnly, $isDarkMode, $isActiveLog }): string =>
		$isActiveLog
			? getActiveLogBackground()
			: getDefaultLogBackground($isReadOnly, $isDarkMode)}
`;

export const ExpandIconWrapper = styled(Col)`
	color: ${blue[6]};
	padding: 0.25rem 0.375rem;
	cursor: pointer;
	font-size: 12px;
`;

interface RawLogContentProps {
	linesPerRow: number;
	$isReadOnly: boolean;
	$isActiveLog: boolean;
}

export const RawLogContent = styled.div<RawLogContentProps>`
	margin-bottom: 0;
	font-family: Fira Code, monospace;
	font-weight: 300;

	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: ${(props): number => props.linesPerRow};
	line-clamp: ${(props): number => props.linesPerRow};
	-webkit-box-orient: vertical;

	font-size: 1rem;
	line-height: 2rem;

	cursor: ${(props): string =>
		props.$isActiveLog || props.$isReadOnly ? 'initial' : 'pointer'};

	${(props): string =>
		props.$isReadOnly && !props.$isActiveLog ? 'padding: 0 1.5rem;' : ''}
`;

export const ActionButtonsWrapper = styled(Space)`
	position: absolute;
	transform: translate(-50%, -50%);
	top: 50%;
	right: 0;
	cursor: pointer;
`;
