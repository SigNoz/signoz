import { AutoComplete, Select, Space } from 'antd';
import styled from 'styled-components';

export const SpaceComponent = styled(Space)`
	&&& {
		width: 100%;
	}
`;

export const SelectComponent = styled(Select)`
	&&& {
		width: 100%;
	}
`;

export const Container = styled(Space)`
	&&& {
		display: flex;
		margin-top: 1rem;
		margin-bottom: 1rem;
	}

	.ant-space-item:not(:last-child) {
		width: 100%;
	}
`;

export const IconContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	cursor: pointer;

	margin-left: 1.125rem;
`;

export const AutoCompleteComponent = styled(AutoComplete)`
	&&& {
		width: 100%;
	}
`;
