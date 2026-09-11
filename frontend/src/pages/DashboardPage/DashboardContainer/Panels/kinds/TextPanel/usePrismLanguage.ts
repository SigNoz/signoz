import { useEffect, useState } from 'react';

import { isLanguageRegistered, loadLanguage } from './syntaxLanguages';

/**
 * Registers `language` with Prism on demand, reporting when it is ready to
 * highlight with. Already-loaded languages report ready on the first render, so a
 * second fence of the same language never flashes unhighlighted.
 */
export function usePrismLanguage(language: string | null): boolean {
	const [isReady, setIsReady] = useState(
		() => !!language && isLanguageRegistered(language),
	);

	useEffect(() => {
		if (!language) {
			setIsReady(false);
			return undefined;
		}
		if (isLanguageRegistered(language)) {
			setIsReady(true);
			return undefined;
		}

		setIsReady(false);
		let isStale = false;
		// `loadLanguage` resolves false rather than rejecting, so there is no failure
		// path here beyond leaving the block unhighlighted.
		void loadLanguage(language).then((loaded): boolean => {
			if (!isStale && loaded) {
				setIsReady(true);
			}
			return loaded;
		});

		return (): void => {
			isStale = true;
		};
	}, [language]);

	return isReady;
}
