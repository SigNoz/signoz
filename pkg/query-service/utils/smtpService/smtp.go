package smtpservice

import (
	"net/smtp"
	"strings"
	"sync"

	"go.signoz.io/signoz/pkg/query-service/config"
	"go.uber.org/zap"
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
	if len(config.AppConfig.SmtpHost) == 0 {
		zap.L().Warn("No SmtpHost env is specified.")
	}
	if len(config.AppConfig.SmtpPort) == 0 {
		zap.L().Warn("No SmtpPort env is specified.")
	}
	if len(config.AppConfig.SmtpUsername) == 0 {
		zap.L().Warn("No SmtpUsername env is specified.")
	}
	if len(config.AppConfig.SmtpPassword) == 0 {
		zap.L().Warn("No SmtpPassword env is specified.")
	}
	if len(config.AppConfig.SmtpFrom) == 0 {
		zap.L().Warn("No SmtpFrom env is specified.")
	}
	return &SMTP{
		Host:     config.AppConfig.SmtpHost,
		Port:     config.AppConfig.SmtpPort,
		Username: config.AppConfig.SmtpUsername,
		Password: config.AppConfig.SmtpPassword,
		From:     config.AppConfig.SmtpFrom,
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
