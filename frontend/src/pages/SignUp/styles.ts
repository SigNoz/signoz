import { Form } from 'antd';
import styled from 'styled-components';

export const Label = styled.label`
	margin-bottom: 0;
	margin-top: 0;
	display: inline-block;
	font-size: 13px;
	font-weight: 600;
	line-height: 1;
	color: var(--l1-foreground);
`;

export const FormContainer = styled(Form)`
	& .ant-form-item {
		margin-bottom: 0px;
	}
`;
