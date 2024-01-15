import { Color } from '@signozhq/design-tokens';
import { Typography } from 'antd';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';

export const ListContainer = styled.div<{ $isDarkMode: boolean }>`
	position: relative;
	height: 20rem;
	overflow: hidden;
	margin: 12px 0;

	background-color: ${({ $isDarkMode }): string =>
		$isDarkMode ? Color.BG_INK_400 : themeColors.lightgrey};
`;

export const EmptyText = styled(Typography)`
	padding: 0 1.5rem;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
`;
