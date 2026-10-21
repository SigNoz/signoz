import { z } from 'zod';

import { isValidIncidentIOURL } from '../utils';
import { requiredString } from './shared';

const required = requiredString('incidentio_required_fields');

export const incidentIOSchema = z.object({
	url: required.refine(isValidIncidentIOURL, {
		message: 'incidentio_url_invalid',
	}),
	token: required,
});
