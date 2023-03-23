import { Card, Form } from 'antd';
import styled from 'styled-components';

export const FormWrapper = styled(Card)`
	display: flex;
	justify-content: center;
	min-width: 390px;
	min-height: 430px;
	max-width: 432px;
	flex: 1;
	align-items: flex-start;
	&&&.ant-card-body {
		min-width: 100%;
	}
`;

export const Label = styled.label`
	margin-bottom: 11px;
	margin-top: 19px;
	display: inline-block;
	font-size: 1rem;
	line-height: 24px;
`;

export const FormContainer = styled(Form)`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	width: 100%;

	& .ant-form-item {
		margin-bottom: 0px;
	}
`;

export const ParentContainer = styled.div`
	width: 100%;
`;
