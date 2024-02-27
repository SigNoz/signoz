package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"

	"github.com/google/uuid"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func createTestUser() (*model.User, *model.ApiError) {
	// Create a test user for auth
	ctx := context.Background()
	org, apiErr := dao.DB().CreateOrg(ctx, &model.Organization{
		Name: "test",
	})
	if apiErr != nil {
		return nil, apiErr
	}

	group, apiErr := dao.DB().GetGroupByName(ctx, constants.AdminGroup)
	if apiErr != nil {
		return nil, apiErr
	}

	auth.InitAuthCache(ctx)

	userId := uuid.NewString()
	return dao.DB().CreateUser(
		ctx,
		&model.User{
			Id:       userId,
			Name:     "test",
			Email:    userId[:8] + "test@test.com",
			Password: "test",
			OrgId:    org.Id,
			GroupId:  group.Id,
		},
		true,
	)
}

func NewAuthenticatedTestRequest(
	user *model.User,
	path string,
	postData interface{},
) (*http.Request, error) {
	userJwt, err := auth.GenerateJWTForUser(user)
	if err != nil {
		return nil, err
	}

	var req *http.Request

	if postData != nil {
		var body bytes.Buffer
		err = json.NewEncoder(&body).Encode(postData)
		if err != nil {
			return nil, err
		}
		req = httptest.NewRequest(http.MethodPost, path, &body)
	} else {
		req = httptest.NewRequest(http.MethodGet, path, nil)
	}

	req.Header.Add("Authorization", "Bearer "+userJwt.AccessJwt)
	return req, nil
}
