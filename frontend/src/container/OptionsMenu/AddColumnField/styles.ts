import { DeleteOutlined } from '@ant-design/icons';
import { Card, Select, SelectProps, Space } from 'antd';
import { themeColors } from 'constants/theme';
import { FunctionComponent } from 'react';
import styled from 'styled-components';

export const SearchIconWrapper = styled(Card)<{ $isDarkMode: boolean }>`
	width: 15%;
	border-color: ${({ $isDarkMode }): string =>
		$isDarkMode ? themeColors.borderDarkGrey : themeColors.borderLightGrey};

	.ant-card-body {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0.25rem;
		font-size: 0.875rem;
	}
`;

export const AddColumnSelect: FunctionComponent<SelectProps> = styled(
	Select,
)<SelectProps>`
	width: 85%;
`;

export const AddColumnWrapper = styled(Space)`
	width: 100%;
`;

export const AddColumnItem = styled(Space)`
	width: 100%;
	display: flex;
	justify-content: space-between;
`;

export const DeleteOutlinedIcon = styled(DeleteOutlined)`
	color: red;
`;
