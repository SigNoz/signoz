import { Button as ButtonComponent, Tag } from 'antd';
import styled from 'styled-components';

export const ButtonContainer = styled.div`
	&&& {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 2rem;
		align-items: center;
	}
`;

export const Button = styled(ButtonComponent)`
	&&& {
		margin-left: 1em;
	}
`;

export const ColumnButton = styled(ButtonComponent)`
	&&& {
		padding-left: 0;
		padding-right: 0;
		margin-right: 1.5em;
	}
`;

export const StyledTag = styled(Tag)`
	&&& {
		white-space: normal;
	}
`;
