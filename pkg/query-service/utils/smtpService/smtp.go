package smtpservice

import (
	"net/smtp"
	"os"
	"strings"
	"sync"
)

type SMTP struct {
	Host     string
	Port     string
	Username string
	Password string
}

var smtpInstance *SMTP
var once sync.Once

func New() *SMTP {
	return &SMTP{
		Host:     os.Getenv("SMTP_HOST"),
		Port:     os.Getenv("SMTP_PORT"),
		Username: os.Getenv("SMTP_USERNAME"),
		Password: os.Getenv("SMTP_PASSWORD"),
	}
}

func GetInstance() *SMTP {
	once.Do(func() {
		smtpInstance = New()
	})
	return smtpInstance
}

func (s *SMTP) Send(to, subject, body string) error {
	auth := smtp.PlainAuth("", s.Username, s.Password, s.Host)

	msg := []byte("To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"\r\n" +
		body + "\r\n")
	addr := s.Host + ":" + s.Port
	return smtp.SendMail(addr, auth, s.Username, strings.Split(to, ","), msg)
}
