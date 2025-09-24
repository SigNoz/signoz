package client

import (
	"net/smtp"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

type loginAuth struct {
	username string
	password string
}

func LoginAuth(username, password string) smtp.Auth {
	return &loginAuth{username, password}
}

func (auth *loginAuth) Start(server *smtp.ServerInfo) (string, []byte, error) {
	return "LOGIN", []byte{}, nil
}

func (auth *loginAuth) Next(fromServer []byte, more bool) ([]byte, error) {
	if more {
		switch strings.ToLower(string(fromServer)) {
		case "username:":
			return []byte(auth.username), nil
		case "password:":
			return []byte(auth.password), nil
		default:
			return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "unexpected server challenge")
		}
	}
	return nil, nil
}
