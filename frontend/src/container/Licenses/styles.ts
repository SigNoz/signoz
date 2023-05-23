import { Form } from 'antd';
import styled from 'styled-components';

export const ApplyFormContainer = styled.div`
	&&& {
		padding-top: 1em;
		padding-bottom: 1em;
	}
`;

export const ApplyForm = styled(Form)`
	&&& {
		width: 100%;
	}
`;

export const LicenseInput = styled(Form.Item)`
	width: 200px;
	&:focus {
		width: 350px;
		input {
			width: 350px;
		}
	}
`;

export const KeyPreview = styled.div`
	padding-left: 0.5em;
	color: #666;
`;
