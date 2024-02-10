import { Card, Form } from 'antd';
import styled from 'styled-components';

export const FormWrapper = styled(Card)`
	display: flex;
	justify-content: center;
	width: 432px;
	flex: 1;

	.ant-card-body {
		width: 100%;
	}
`;

export const ButtonContainer = styled.div`
	margin-top: 1.8125rem;
	display: flex;
	justify-content: center;
	align-items: center;
`;

export const FormContainer = styled(Form)`
	& .ant-form-item {
		margin-bottom: 0px;
	}
`;
