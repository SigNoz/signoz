package smtpservice

import (
	"net/smtp"
	"strings"
	"sync"

	"go.signoz.io/signoz/pkg/query-service/constants"
)

type SMTP struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

var smtpInstance *SMTP
var once sync.Once

func New() *SMTP {
	return &SMTP{
		Host:     constants.SmtpHost,
		Port:     constants.SmtpPort,
		Username: constants.SmtpUsername,
		Password: constants.SmtpPassword,
		From:     constants.SmtpFrom,
	}
}

func GetInstance() *SMTP {
	once.Do(func() {
		smtpInstance = New()
	})
	return smtpInstance
}

func (s *SMTP) SendEmail(to, subject, body string) error {

	msgString := "From: " + s.From + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		"\r\n" +
		body

	msg := []byte(msgString)

	addr := s.Host + ":" + s.Port
	if s.Password == "" || s.Username == "" {
		return smtp.SendMail(addr, nil, s.From, strings.Split(to, ","), msg)
	} else {
		auth := smtp.PlainAuth("", s.Username, s.Password, s.Host)
		return smtp.SendMail(addr, auth, s.From, strings.Split(to, ","), msg)
	}
}
