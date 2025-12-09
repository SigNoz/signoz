import { Card, Space, Typography } from 'antd';
import styled from 'styled-components';

export const OptionsContainer = styled(Card)`
	.ant-card-body {
		display: flex;
		padding: 0.25rem 0.938rem;
		cursor: pointer;
	}
`;

export const OptionsContentWrapper = styled(Space)`
	width: 21rem;
	padding: 0.25rem 0.5rem;
`;

export const FieldTitle = styled(Typography.Text)`
	font-size: 0.75rem;
`;

export const ColumnTitleWrapper = styled.span`
	display: inline-flex;
	align-items: center;
	gap: 4px;
	word-break: break-word;
`;

export const ColumnTitleIcon = styled.span`
	font-size: 12px;
	color: var(--bg-vanilla-400);
`;
