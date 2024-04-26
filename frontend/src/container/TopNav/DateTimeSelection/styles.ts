import { Form as FormComponent, Typography as TypographyComponent } from 'antd';
import styled from 'styled-components';

export const Form = styled(FormComponent)`
	&&& {
		justify-content: flex-end;
	}
`;

export const Typography = styled(TypographyComponent)`
	&&& {
		text-align: right;
	}
`;

export const FormItem = styled(Form.Item)`
	&&& {
		margin: 0;
	}
`;

interface Props {
	refreshButtonHidden: boolean;
}

export const RefreshTextContainer = styled.div<Props>`
	visibility: ${({ refreshButtonHidden }): string =>
		refreshButtonHidden ? 'hidden' : 'visible'};
`;

export const FormContainer = styled.div`
	display: flex;
	gap: 0.1rem;
`;
