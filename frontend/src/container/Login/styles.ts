import { Form } from 'antd';
import styled from 'styled-components';

export const Label = styled.label`
	font-family: var(--font-family-inter, Inter), sans-serif;
	font-size: 13px;
	font-weight: 600;
	line-height: 1;
	letter-spacing: -0.065px;
	color: var(--levels-l1-foreground, #eceef2);
	margin-bottom: 12px;
	display: block;
`;

export const FormContainer = styled(Form)`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	width: 100%;

	& .ant-form-item {
		margin-bottom: 0px;
		width: 100%;
	}

	& .ant-input,
	& .ant-input-password,
	& .ant-select-selector {
		background: var(--levels-l3-background, #23262e) !important;
		border-color: var(--levels-l3-border, #2c303a) !important;
		color: var(--levels-l1-foreground, #eceef2) !important;
	}

	& .ant-input::placeholder {
		color: var(--levels-l3-foreground, #747b8b) !important;
	}

	& .ant-input:focus,
	& .ant-input-password:focus,
	& .ant-select-focused .ant-select-selector {
		border-color: var(--semantic-primary-background, #4e74f8) !important;
		box-shadow: none !important;
	}
`;

export const ParentContainer = styled.div`
	width: 100%;
	display: flex;
	flex-direction: column;
`;
