package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addSessionRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/sessions/email_password", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.CreateSessionByEmailPassword), handler.OpenAPIDef{
		ID:                  "CreateSessionByEmailPassword",
		Tags:                []string{"sessions"},
		Summary:             "Create session by email and password",
		Description:         "This endpoint creates a session for a user using email and password.",
		Request:             new(authtypes.PostableEmailPasswordSession),
		RequestContentType:  "application/json",
		Response:            new(authtypes.GettableToken),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{},
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/sessions/context", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.GetSessionContext), handler.OpenAPIDef{
		ID:                  "GetSessionContext",
		Tags:                []string{"sessions"},
		Summary:             "Get session context",
		Description:         "This endpoint returns the context for the session",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(authtypes.SessionContext),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{},
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/sessions/rotate", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.RotateSession), handler.OpenAPIDef{
		ID:                  "RotateSession",
		Tags:                []string{"sessions"},
		Summary:             "Rotate session",
		Description:         "This endpoint rotates the session",
		Request:             new(authtypes.PostableRotateToken),
		RequestContentType:  "application/json",
		Response:            new(authtypes.GettableToken),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{},
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/sessions", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.DeleteSession), handler.OpenAPIDef{
		ID:                  "DeleteSession",
		Tags:                []string{"sessions"},
		Summary:             "Delete session",
		Description:         "This endpoint deletes the session",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{{Name: ctxtypes.AuthTypeTokenizer.StringValue()}},
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/complete/google", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.CreateSessionByGoogleCallback), handler.OpenAPIDef{
		ID:                  "CreateSessionByGoogleCallback",
		Tags:                []string{"sessions"},
		Summary:             "Create session by google callback",
		Description:         "This endpoint creates a session for a user using google callback",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(authtypes.GettableToken),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusSeeOther,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{},
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/complete/saml", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.CreateSessionBySAMLCallback), handler.OpenAPIDef{
		ID:          "CreateSessionBySAMLCallback",
		Tags:        []string{"sessions"},
		Summary:     "Create session by saml callback",
		Description: "This endpoint creates a session for a user using saml callback",
		Request: struct {
			RelayState   string `form:"RelayState"`
			SAMLResponse string `form:"SAMLResponse"`
		}{},
		RequestContentType:  "application/x-www-form-urlencoded",
		Response:            new(authtypes.GettableToken),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusSeeOther,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound, http.StatusUnavailableForLegalReasons},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{},
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/complete/oidc", handler.New(provider.authZ.OpenAccess(provider.sessionHandler.CreateSessionByOIDCCallback), handler.OpenAPIDef{
		ID:                  "CreateSessionByOIDCCallback",
		Tags:                []string{"sessions"},
		Summary:             "Create session by oidc callback",
		Description:         "This endpoint creates a session for a user using oidc callback",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(authtypes.GettableToken),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusSeeOther,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound, http.StatusUnavailableForLegalReasons},
		Deprecated:          false,
		SecuritySchemes:     []handler.OpenAPISecurityScheme{},
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}
