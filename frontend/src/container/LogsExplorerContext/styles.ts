import { Button, Space } from 'antd';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';
import getAlphaColor from 'utils/getAlphaColor';

export const TitleWrapper = styled(Space.Compact)`
	justify-content: space-between;
	align-items: center;
`;

export const EditButton = styled(Button)<{ $isDarkMode: boolean }>`
	margin-right: 0.938rem;
	width: 1.375rem !important;
	height: 1.375rem;
	position: absolute;

	top: 1rem;
	right: 1.563rem;
	padding: 0;

	border-radius: 0.125rem;

	border-start-start-radius: 0.125rem !important;
	border-end-start-radius: 0.125rem !important;

	color: ${({ $isDarkMode }): string =>
		$isDarkMode
			? getAlphaColor(themeColors.white)[45]
			: getAlphaColor(themeColors.black)[45]};
`;

export const LogContainer = styled.div`
	overflow-x: auto;
`;
