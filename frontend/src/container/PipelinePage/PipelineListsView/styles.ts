import { Avatar, Button, Table, Typography } from 'antd';
import { TableProps } from 'antd/lib/table';
import { themeColors } from 'constants/theme';
import { StyledCSS } from 'container/GantChart/Trace/styles';
import styled from 'styled-components';

export const FooterButton = styled(Button)`
	display: flex;
	gap: 0.5rem;
	margin-left: 6.2rem;
	align-items: center;
	font-weight: 400;
	font-size: 0.875rem;
	line-height: 1.25rem;
`;

export const IconListStyle = styled.div`
	display: flex;
	gap: 1rem;
	justify-content: flex-end;
`;

export const ColumnDataStyle = styled.span`
	font-size: 0.75rem;
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

export const ProcessorIndexIcon = styled(Avatar)`
	background-color: ${themeColors.navyBlue};
	height: 1rem;
	width: 1rem;
	font-size: 0.75rem;
	line-height: 0.813rem;
	font-weight: 400;
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

export const AlertContentWrapper = styled.div`
	font-weight: 400;
	font-style: normal;
	font-size: 0.75rem;
	margin-bottom: 0.5rem;
`;

export const AlertModalTitle = styled.h1`
	font-weight: 600;
	font-size: 0.875rem;
	line-height: 1rem;
`;

export const Container = styled.div`
	margin-top: 3rem;
`;

export const LastActionColumn = styled.div`
	display: flex;
	justify-content: center;
	gap: 1.25rem;
	align-items: center;
`;

export const ModalTitle = styled(Typography.Title)`
	font-style: normal;
	font-weight: 600;
	font-size: 1.125rem;
	line-height: 1.5rem;
`;

export const ModalButtonWrapper = styled.div`
	display: flex;
	flex-direction: row-reverse;
	gap: 0.625rem;
`;

export const ModeAndConfigWrapper = styled.div`
	display: flex;
	gap: 0.5rem;
	justify-content: flex-end;
	color: ${themeColors.gamboge};
	margin: 0.125rem;
	padding: 0.313rem;
`;

export const SaveConfigWrapper = styled.div`
	display: flex;
	justify-content: flex-end;
	gap: 0.938rem;
	margin-top: 1.25rem;
`;
