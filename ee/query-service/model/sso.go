package model

// SamlConfig contans SAML params to generate and respond to the requests 
// from SAML provider
type SamlConfig struct {
	SamlEntity string `json:"samlEntity"`
	SamlIdp    string `json:"samlIdp"`
	SamlCert   string `json:"samlCert"`
}

// GoogleOauthConfig contains a generic config to support oauth 
type GoogleOAuthConfig struct {
	ClientID     string `json:"clientID"`
	ClientSecret string `json:"clientSecret"`
	RedirectURI  string `json:"redirectURI"`
}

// SSOIdentity contains details of user received from SSO provider 
type SSOIdentity struct {
	UserID            string
	Username          string
	PreferredUsername string
	Email             string
	EmailVerified     bool

}

// OAuthCallbackProvider is an interface implemented by connectors which use an OAuth
// style redirect flow to determine user information.
type OAuthCallbackProvider interface {
	// The initial URL user would be redirect to.  
	// OAuth2 implementations support various scopes but we only need profile and user as 
	// the roles are still being managed in SigNoz. 
	BuildAuthURL(state string) (string, error)

	// Handle the callback to the server (after login at oauth provider site)
	// and return a email identity. 
	// At the moment we dont support auto signup flow (based on domain), so 
	// the full identity (including name, group etc) is not required outside of the 
	// connector 
	HandleCallback(r *http.Request) (email string, err error)
}
