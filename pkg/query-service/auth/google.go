package auth

import (
	"context"
	"encoding/json"

	"github.com/golang/glog"
	"go.uber.org/zap"
	"golang.org/x/oauth2"
)

type GoogleUserInfo struct {
	ID      string `json:"sub"`
	Email   string `json:"email"`
	Picture string `json:"picture"`
}

type GoogleOAuthProvider struct {
	Config *oauth2.Config
}

func (o *GoogleOAuthProvider) GetUserFromToken(code string) (*OAuthUser, error) {
	token, err := o.Config.Exchange(context.Background(), code)
	if err != nil {
		return nil, err
	}

	client := o.Config.Client(oauth2.NoContext, token)

	res, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
	if err != nil {
		return nil, err
	}

	defer res.Body.Close()
	var userInfo GoogleUserInfo
	if err = json.NewDecoder(res.Body).Decode(&userInfo); err != nil {
		glog.Error("error while decoding token ", err)
		return nil, err
	}

	return &OAuthUser{
		ID:      userInfo.ID,
		Email:   userInfo.Email,
		Picture: userInfo.Picture,
	}, nil
}

func (o *GoogleOAuthProvider) GetRedirectURL(state string) string {

	zap.S().Infof("config is: %+v\n", o.Config)

	return o.Config.AuthCodeURL(state)
}
