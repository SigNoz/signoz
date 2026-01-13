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

	.lightMode & {
		color: var(--text-ink-500);
	}
`;

export const FormContainer = styled(Form)`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	width: 100%;

	& .ant-form-item {
		margin-bottom: 0px;
		width: 100%;

		& .ant-select {
			width: 100%;
			margin: 0;
		}

		& .ant-form-item-control {
			width: 100%;
		}

		& .ant-form-item-control-input {
			width: 100%;
		}

		& .ant-form-item-control-input-content {
			width: 100%;
		}
	}

	& .ant-input,
	& .ant-input-password,
	& .ant-select-selector {
		background: var(--levels-l3-background, #23262e) !important;
		border-color: var(--levels-l3-border, #2c303a) !important;
		color: var(--levels-l1-foreground, #eceef2) !important;

		.lightMode & {
			background: var(--bg-vanilla-200, #f5f5f5) !important;
			border-color: var(--bg-vanilla-300, #e9e9e9) !important;
			color: var(--text-ink-500) !important;
		}
	}

	& .ant-input::placeholder {
		color: var(--levels-l3-foreground, #747b8b) !important;

		.lightMode & {
			color: var(--text-neutral-light-200, #80828d) !important;
		}
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
