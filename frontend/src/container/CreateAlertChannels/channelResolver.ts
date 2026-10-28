import { TFunction } from 'i18next';
import { get, set } from 'lodash-es';
import type { FieldErrors, Resolver } from 'react-hook-form';
import type { $ZodIssue } from 'zod/v4/core';

import { channelNameSchema } from './schemas/shared';
import { ChannelFormValues, ChannelKind } from './types';
import { CHANNEL_SCHEMAS } from './validation';

const toFieldErrors = (
	issues: $ZodIssue[],
	t: TFunction,
): FieldErrors<ChannelFormValues> => {
	const errors = {};

	issues.forEach((issue) => {
		const path = issue.path.length ? issue.path : ['name'];
		if (!get(errors, path)) {
			set(errors, path, { type: 'validation', message: t(issue.message) });
		}
	});

	return errors as FieldErrors<ChannelFormValues>;
};

export const channelResolver =
	(kind: ChannelKind, t: TFunction): Resolver<ChannelFormValues> =>
	async (values) => {
		const schema = CHANNEL_SCHEMAS[kind];
		const issues: $ZodIssue[] = [
			...(channelNameSchema.safeParse(values).error?.issues ?? []),
			...(schema ? (schema.safeParse(values).error?.issues ?? []) : []),
		];

		if (issues.length === 0) {
			return { values, errors: {} };
		}

		return { values: {}, errors: toFieldErrors(issues, t) };
	};
