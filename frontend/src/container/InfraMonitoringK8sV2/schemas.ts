import { z } from 'zod';

export const orderBySchema = z
	.object({
		columnName: z.string(),
		order: z.enum(['asc', 'desc']),
	})
	.nullable();

export type OrderBySchemaType = z.infer<typeof orderBySchema>;
