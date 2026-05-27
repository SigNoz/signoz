import { Button, Space } from 'antd';
import { ComboboxSimple } from '@signozhq/ui/combobox';
import { Typography } from '@signozhq/ui/typography';
import styled from 'styled-components';

export const DashboardSelect = styled(ComboboxSimple)`
	width: 100%;
`;

export const SelectWrapper = styled(Space)`
	width: 100%;
	margin-bottom: 1rem;

	.ant-space-item:first-child {
		width: 100%;
		max-width: 20rem;
	}
`;

export const Wrapper = styled(Space)`
	width: 100%;
`;

export const NewDashboardButton = styled(Button)`
	&&& {
		padding: 0 0.125rem;
	}
`;

export const Title = styled(Typography.Text)`
	font-size: 1rem;
`;
