import { Tag } from 'antd';
import styled from 'styled-components';

export const TagsContainer = styled.div`
	margin-top: 0.5rem;
	display: flex;
`;

export const NewTagContainer = styled(Tag)`
	&&& {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 100%;

		svg {
			margin-right: 0.2rem;
		}
	}
`;
