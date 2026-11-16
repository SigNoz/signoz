import { useMemo } from 'react';
import type { RuletypesLabelPairDTO } from 'api/generated/services/sigNoz.schemas';
import type { SuggestionSource } from 'components/ListFilter/dsl/types';
import type { CreatorOption } from 'components/ListFilter/types';
import { useCreatorOptions } from 'components/ListFilter/useCreatorOptions';

import type { AlertRule } from './types';

const LABEL_PREFIX = 'labels.';

interface UseAlertRulesFilterSourceArgs {
	rules: AlertRule[];
	labels: RuletypesLabelPairDTO[];
	reservedKeywords: string[] | undefined;
	userEmail: string;
}

interface UseAlertRulesFilterSourceResult {
	creatorOptions: CreatorOption[];
	source: SuggestionSource;
}

export function useAlertRulesFilterSource({
	rules,
	labels,
	reservedKeywords,
	userEmail,
}: UseAlertRulesFilterSourceArgs): UseAlertRulesFilterSourceResult {
	const pageAuthorEmails = useMemo<string[]>(
		() =>
			rules.map((r) => r.createdBy).filter((email): email is string => !!email),
		[rules],
	);
	const creatorOptions = useCreatorOptions({
		currentUserEmail: userEmail,
		fallbackEmails: pageAuthorEmails,
	});

	const source = useMemo<SuggestionSource>(() => {
		const dynamicKeys = new Set<string>();
		const valuesByKey: Record<string, string[]> = {};
		labels.forEach(({ key, value }) => {
			const fullKey = `${LABEL_PREFIX}${key}`;
			dynamicKeys.add(fullKey);
			(valuesByKey[fullKey.toLowerCase()] ??= []).push(value);
		});
		return {
			reservedKeys: reservedKeywords,
			dynamicKeys: Array.from(dynamicKeys),
			valuesByKey,
			creatorEmails: creatorOptions.map((o) => o.email),
			currentUserEmail: userEmail,
		};
	}, [labels, reservedKeywords, creatorOptions, userEmail]);

	return { creatorOptions, source };
}
