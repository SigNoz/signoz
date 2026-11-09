import { Form as FormComponent } from 'antd';
import styled from 'styled-components';

export const Form = styled(FormComponent)`
	&&& {
		justify-content: flex-end;
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
	padding-right: 8px;
	visibility: ${({ refreshButtonHidden }: Props): string =>
		refreshButtonHidden ? 'hidden' : 'visible'};
`;

export const FormContainer = styled.div`
	display: flex;
`;
