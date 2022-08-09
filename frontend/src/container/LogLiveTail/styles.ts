import { Card, Select } from 'antd';
import styled from 'styled-components';

export const TimePickerCard = styled(Card)`
	.ant-card-body {
		padding: 0;
	}
`;

export const TimePickerSelect = styled(Select)`
	min-width: 100px;
	.ant-select-selector {
		outline: none;
		border: none !important;
		padding: 0;
	}
`;
