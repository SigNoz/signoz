import { Button as ButtonComponent, Table } from 'antd';
import { TableProps } from 'antd/lib/table';
import { themeColors } from 'constants/theme';
import styled, { DefaultTheme, ThemedCssFunction } from 'styled-components';

export type StyledCSS =
	| ReturnType<ThemedCssFunction<DefaultTheme>>
	| string
	| false
	| undefined;

export const ButtonContainer = styled.div`
	&&& {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 2rem;
		align-items: center;
	}
`;

export const Button = styled(ButtonComponent)`
	&&& {
		margin-left: 1em;
	}
`;

export const Container = styled.div`
	margin-top: 3rem;
`;

export const AlertContentWrapper = styled.div`
	font-weight: 400;
	font-style: normal;
	font-size: 0.75rem;
`;

export const ListItemTitleWrapper = styled.p`
	display: flex;
	font-style: normal;
	font-weight: 400;
	font-size: 0.813rem;
	line-height: 0rem;
	color: ${themeColors.gainsboro};
`;

export const ModalFooterTitle = styled.span`
	font-style: normal;
	font-weight: 400;
	font-size: 14px;
	line-height: 1.25rem;
`;

export const ListDataStyle = styled.div`
	margin: 2px;
	padding: 5px;
	border: none;
	font-style: normal;
	font-weight: 400;
	font-size: 12px;
	line-height: 20px;
`;

export const LastActionColumnStyle = styled.div`
	display: flex;
	justify-content: center;
	gap: 20px;
	align-items: center;
`;

export const IconListStyle = styled.div`
	display: flex;
	gap: 16px;
	justify-content: flex-end;
`;

export const StyledTable: React.FC<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TableProps<any> & { isDarkMode: boolean }
> = styled(Table)`
	.ant-table-tbody > tr > td {
		border: none;
	}

	.ant-table-tbody > tr:last-child > td {
		border: none;
	}
	.ant-table-content {
		background: ${({ isDarkMode }: { isDarkMode: boolean }): StyledCSS =>
			isDarkMode ? themeColors.neroBlack : themeColors.snowWhite};
	}
`;
