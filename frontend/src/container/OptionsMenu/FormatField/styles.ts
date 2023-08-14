import { Radio, Space } from 'antd';
import styled from 'styled-components';

export const FormatFieldWrapper = styled(Space)`
	width: 100%;
	margin-bottom: 1.125rem;
`;

export const RadioGroup = styled(Radio.Group)`
	display: flex;
	text-align: center;
`;

export const RadioButton = styled(Radio.Button)`
	font-size: 0.75rem;
	flex: 1;
`;
