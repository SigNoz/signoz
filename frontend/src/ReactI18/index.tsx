import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

import cacheBursting from '../../i18n-translations-hash.json';

i18n
	// load translation using http -> see /public/locales
	.use(Backend)
	// detect user language
	.use(LanguageDetector)
	// pass the i18n instance to react-i18next.
	.use(initReactI18next)
	// init i18next
	.init({
		debug: false,
		fallbackLng: 'en',
		interpolation: {
			escapeValue: false, // not needed for react as it escapes by default
		},
		backend: {
			loadPath: (language, namespace) => {
				const ns = namespace[0];
				const pathkey = `/${language}/${ns}`;
				const hash = cacheBursting[pathkey as keyof typeof cacheBursting] || '';
				return `/locales/${language}/${namespace}.json?h=${hash}`;
			},
		},
		react: {
			useSuspense: false,
		},
	});

export default i18n;
