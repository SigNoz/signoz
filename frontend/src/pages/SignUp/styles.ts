import { CSSProperties } from 'react';
import { Card, Form } from 'antd';
import styled from 'styled-components';

export const FormWrapper = styled(Card)`
	display: flex;
	justify-content: center;
	max-width: 432px;
	flex: 1;
`;

export const Label = styled.label`
	margin-bottom: 0;
	margin-top: 0;
	display: inline-block;
	font-size: 13px;
	font-weight: 600;
	line-height: 1;
	color: var(--levels-l1-foreground, #eceef2);

	.lightMode & {
		color: var(--text-ink-500);
	}
`;

export const ButtonContainer = styled.div`
	margin-top: 1.8125rem;
	display: flex;
	justify-content: center;
	align-items: center;
`;

interface Props {
	marginTop: CSSProperties['marginTop'];
}

export const MarginTop = styled.div<Props>`
	margin-top: ${({ marginTop = 0 }): number | string => marginTop};
`;

export const FormContainer = styled(Form)`
	& .ant-form-item {
		margin-bottom: 0px;
	}
`;
