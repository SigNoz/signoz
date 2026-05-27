import { Card } from 'antd';
import { SelectSimple } from '@signozhq/ui/select';
import styled from 'styled-components';

export const TimePickerCard = styled(Card)`
	.ant-card-body {
		display: flex;
		padding: 0;
	}
`;

export const TimePickerSelect = styled(SelectSimple)`
	min-width: 100px;
`;

interface Props {
	isDarkMode: boolean;
}

export const StopContainer = styled.div<Props>`
	height: 0.8rem;
	width: 0.8rem;
	border-radius: 0.1rem;
	background-color: ${({ isDarkMode }): string =>
		isDarkMode ? '#fff' : '#000'};
`;
