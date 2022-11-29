package auth

import (
	"context"
	"github.com/coreos/go-oidc/v3/oidc"

	"go.uber.org/zap"
	"go.signoz.io/signoz/ee/query-service/model"
	modelsso "go.signoz.io/signoz/ee/query-service/model/sso"
)

type googleOAuthProvider struct {
	redirectURI                    string
	oauth2Config                   *oauth2.Config
	verifier                       *oidc.IDTokenVerifier
	cancel                         context.CancelFunc
	hostedDomain 				   string
}

func NewGoogleAuthProvider(domain string, c model.GoogleOAuthConfig) (model.OAuthCallbackProvider, error) {

	ctx, cancel := context.WithCancel(context.Background())

	provider, err := oidc.NewProvider(ctx, issuerURL)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to get provider: %v", err)
	}

	scopes := ["email"]

	return &googleOAuthProvider{
		redirectURI: c.redirectURI,
		oauth2Config: &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: c.ClientSecret,
			Endpoint:     provider.Endpoint(),
			Scopes:       scopes,
			RedirectURL:  c.RedirectURI,
		},
		verifier: provider.Verifier(
			&oidc.Config{ClientID: clientID},
		),
		cancel:                         cancel,
		hostedDomain:                  []string{domain},
	}, nil
}

func (g *googleOAuthProvider) LoginURL(callbackURL, state string) (string, error) {
}


func (g *googleOAuthProvider) HandleCallback(r *http.Request) (identity modelsso.SSOIdentity, err error) {

}
