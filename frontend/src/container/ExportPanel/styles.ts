import { Button, Select, SelectProps, Space, Typography } from 'antd';
import { FunctionComponent } from 'react';
import styled from 'styled-components';

export const DashboardSelect: FunctionComponent<SelectProps> = styled(
	Select,
)<SelectProps>`
	width: 100%;
`;

export const SelectWrapper = styled(Space)`
	width: 100%;
	margin-bottom: 1rem;

	.ant-space-item:first-child {
		width: 100%;
	}
`;

export const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: center;
	height: 100%;
	padding: 16px;
	max-width: 600px;
	margin: 0 auto;
	border-radius: 4px;
	box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);

	> * {
		margin-bottom: 8px;
	}
`;

export const NewDashboardButton = styled(Button)`
	&&& {
		padding: 0 0.125rem;
		color: #7190f9;
	}
`;

export const IconWrapper = styled.span`
	padding: 0 1px;
	background: #7190f9;
	color: black;
`;

export const Title = styled(Typography.Text)`
	font-size: 14px;
`;

export const ButtonWrapper = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
`;

export const DiscardButton = styled(Button)`
	border-radius: 2px;
	background: var(--Slate-300, #242834);
	color: white;
	border: none;
	display: inline-flex;
	align-items: center;
	justify-content: center;
`;

export const ExportButton = styled(Button)`
	&&& {
		margin-left: 10px;

		&[disabled] {
			background-color: #4e74f8;
			color: rgba(255, 255, 255, 0.65);
			border-color: #1890ff;
			opacity: 0.6;
		}
	}
`;
