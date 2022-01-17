import styled from 'styled-components';
import { Button, Select, Space } from 'antd';

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

export const Container = styled.div`
	&&& {
		display: flex;
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
`;
