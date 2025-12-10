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

export const AddColumnItem = styled.div`
	width: 100%;
	display: flex;
	justify-content: space-between;
`;

export const DeleteOutlinedIcon = styled(DeleteOutlined)`
	color: red;
`;

export const OptionContent = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	gap: 8px;
	min-width: 0;

	.option-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;
export const NameWrapper = styled.span`
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: calc(100% - 26px);
	gap: 8px;
	min-width: 0;
`;
export const Name = styled.span`
	flex: 1;
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
`;
