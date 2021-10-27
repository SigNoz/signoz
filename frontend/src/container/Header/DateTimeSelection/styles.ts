import { Form as FormComponent, Typography as TypographyComponent } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	justify-content: flex-end;
`;

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

export const RefreshTextContainer = styled.div`
	min-height: 2rem;
`;
