import { z } from 'zod';

import { requiredString } from './shared';

const required = requiredString('incidentio_required_fields');

export const incidentIOSchema = z.object({
	url: required,
	token: required,
});
