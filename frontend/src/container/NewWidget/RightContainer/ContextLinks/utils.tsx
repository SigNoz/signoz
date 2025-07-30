import { CONTEXT_LINK_FIELDS } from 'container/NewWidget/RightContainer/ContextLinks/constants';
import { ContextLinkProps } from 'types/api/dashboard/getAll';
import { v4 as uuid } from 'uuid';

const getInitialValues = (
	contextLink: ContextLinkProps | null,
): Record<string, string> => ({
	[CONTEXT_LINK_FIELDS.ID]: contextLink?.id || uuid(),
	[CONTEXT_LINK_FIELDS.LABEL]: contextLink?.label || '',
	[CONTEXT_LINK_FIELDS.URL]: contextLink?.url || '',
});

export { getInitialValues };
