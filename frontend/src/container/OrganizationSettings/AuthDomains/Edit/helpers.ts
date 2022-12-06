import {
	AuthDomain,
	GOOGLE_AUTH,
	GoogleAuthConfig,
	isGoogleAuthConfig,
	isSAMLConfig,
	SAML,
	SAMLConfig,
} from 'types/api/SAML/listDomain';

export function parseSamlForm(
	current: AuthDomain,
	formValues: AuthDomain,
): SAMLConfig | undefined {
	if (current?.ssoType === SAML && isSAMLConfig(formValues?.samlConfig)) {
		return {
			...current.samlConfig,
			...formValues?.samlConfig,
		};
	}

	return current.samlConfig;
}

export function parseGoogleAuthForm(
	current: AuthDomain,
	formValues: AuthDomain,
): GoogleAuthConfig | undefined {
	if (
		current?.ssoType === GOOGLE_AUTH &&
		isGoogleAuthConfig(formValues?.googleAuthConfig)
	) {
		return {
			...current.googleAuthConfig,
			...formValues?.googleAuthConfig,
		};
	}

	return current.googleAuthConfig;
}
