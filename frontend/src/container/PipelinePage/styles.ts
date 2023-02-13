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
		margin-left: 1rem;
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
	font-size: 0.875rem;
	line-height: 1.25rem;
`;

export const ListDataStyle = styled.div`
	margin: 0.125rem;
	padding: 0.313rem;
	border: none;
	font-style: normal;
	font-weight: 400;
	font-size: 0.75rem;
	line-height: 1.25rem;
`;

export const LastActionColumnStyle = styled.div`
	display: flex;
	justify-content: center;
	gap: 1.25rem;
	align-items: center;
`;

export const IconListStyle = styled.div`
	display: flex;
	gap: 1rem;
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

export const SpanStyle = styled.span`
	font-size: 0.75rem;
	font-weight: 400;
	line-height: 1.25rem;
`;
