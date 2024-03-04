// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package kafka

import (
	"testing"

	"github.com/IBM/sarama"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/config/configtls"
)

func TestAuthentication(t *testing.T) {
	saramaPlaintext := &sarama.Config{}
	saramaPlaintext.Net.SASL.Enable = true
	saramaPlaintext.Net.SASL.User = "jdoe"
	saramaPlaintext.Net.SASL.Password = "pass"

	saramaSASLSCRAM256Config := &sarama.Config{}
	saramaSASLSCRAM256Config.Net.SASL.Enable = true
	saramaSASLSCRAM256Config.Net.SASL.User = "jdoe"
	saramaSASLSCRAM256Config.Net.SASL.Password = "pass"
	saramaSASLSCRAM256Config.Net.SASL.Mechanism = sarama.SASLTypeSCRAMSHA256

	saramaSASLSCRAM512Config := &sarama.Config{}
	saramaSASLSCRAM512Config.Net.SASL.Enable = true
	saramaSASLSCRAM512Config.Net.SASL.User = "jdoe"
	saramaSASLSCRAM512Config.Net.SASL.Password = "pass"
	saramaSASLSCRAM512Config.Net.SASL.Mechanism = sarama.SASLTypeSCRAMSHA512

	saramaSASLHandshakeV1Config := &sarama.Config{}
	saramaSASLHandshakeV1Config.Net.SASL.Enable = true
	saramaSASLHandshakeV1Config.Net.SASL.User = "jdoe"
	saramaSASLHandshakeV1Config.Net.SASL.Password = "pass"
	saramaSASLHandshakeV1Config.Net.SASL.Mechanism = sarama.SASLTypeSCRAMSHA512
	saramaSASLHandshakeV1Config.Net.SASL.Version = sarama.SASLHandshakeV1

	saramaSASLPLAINConfig := &sarama.Config{}
	saramaSASLPLAINConfig.Net.SASL.Enable = true
	saramaSASLPLAINConfig.Net.SASL.User = "jdoe"
	saramaSASLPLAINConfig.Net.SASL.Password = "pass"

	saramaSASLPLAINConfig.Net.SASL.Mechanism = sarama.SASLTypePlaintext

	saramaTLSCfg := &sarama.Config{}
	saramaTLSCfg.Net.TLS.Enable = true
	tlsClient := configtls.TLSClientSetting{}
	tlscfg, err := tlsClient.LoadTLSConfig()
	require.NoError(t, err)
	saramaTLSCfg.Net.TLS.Config = tlscfg

	saramaKerberosCfg := &sarama.Config{}
	saramaKerberosCfg.Net.SASL.Mechanism = sarama.SASLTypeGSSAPI
	saramaKerberosCfg.Net.SASL.Enable = true
	saramaKerberosCfg.Net.SASL.GSSAPI.ServiceName = "foobar"
	saramaKerberosCfg.Net.SASL.GSSAPI.AuthType = sarama.KRB5_USER_AUTH

	saramaKerberosKeyTabCfg := &sarama.Config{}
	saramaKerberosKeyTabCfg.Net.SASL.Mechanism = sarama.SASLTypeGSSAPI
	saramaKerberosKeyTabCfg.Net.SASL.Enable = true
	saramaKerberosKeyTabCfg.Net.SASL.GSSAPI.KeyTabPath = "/path"
	saramaKerberosKeyTabCfg.Net.SASL.GSSAPI.AuthType = sarama.KRB5_KEYTAB_AUTH

	tests := []struct {
		auth         Authentication
		saramaConfig *sarama.Config
		err          string
	}{
		{
			auth:         Authentication{PlainText: &PlainTextConfig{Username: "jdoe", Password: "pass"}},
			saramaConfig: saramaPlaintext,
		},
		{
			auth:         Authentication{TLS: &configtls.TLSClientSetting{}},
			saramaConfig: saramaTLSCfg,
		},
		{
			auth: Authentication{TLS: &configtls.TLSClientSetting{
				TLSSetting: configtls.TLSSetting{CAFile: "/doesnotexists"},
			}},
			saramaConfig: saramaTLSCfg,
			err:          "failed to load TLS config",
		},
		{
			auth:         Authentication{Kerberos: &KerberosConfig{ServiceName: "foobar"}},
			saramaConfig: saramaKerberosCfg,
		},
		{
			auth:         Authentication{Kerberos: &KerberosConfig{UseKeyTab: true, KeyTabPath: "/path"}},
			saramaConfig: saramaKerberosKeyTabCfg,
		},
		{
			auth:         Authentication{SASL: &SASLConfig{Username: "jdoe", Password: "pass", Mechanism: "SCRAM-SHA-256"}},
			saramaConfig: saramaSASLSCRAM256Config,
		},
		{
			auth:         Authentication{SASL: &SASLConfig{Username: "jdoe", Password: "pass", Mechanism: "SCRAM-SHA-512"}},
			saramaConfig: saramaSASLSCRAM512Config,
		},
		{
			auth:         Authentication{SASL: &SASLConfig{Username: "jdoe", Password: "pass", Mechanism: "SCRAM-SHA-512", Version: 1}},
			saramaConfig: saramaSASLHandshakeV1Config,
		},
		{
			auth:         Authentication{SASL: &SASLConfig{Username: "jdoe", Password: "pass", Mechanism: "PLAIN"}},
			saramaConfig: saramaSASLPLAINConfig,
		},
		{
			auth:         Authentication{SASL: &SASLConfig{Username: "jdoe", Password: "pass", Mechanism: "SCRAM-SHA-222"}},
			saramaConfig: saramaSASLSCRAM512Config,
			err:          "invalid SASL Mechanism",
		},
		{
			auth:         Authentication{SASL: &SASLConfig{Username: "", Password: "pass", Mechanism: "SCRAM-SHA-512"}},
			saramaConfig: saramaSASLSCRAM512Config,
			err:          "username have to be provided",
		},
		{
			auth:         Authentication{SASL: &SASLConfig{Username: "jdoe", Password: "", Mechanism: "SCRAM-SHA-512"}},
			saramaConfig: saramaSASLSCRAM512Config,
			err:          "password have to be provided",
		},
		{
			auth:         Authentication{SASL: &SASLConfig{Username: "jdoe", Password: "pass", Mechanism: "SCRAM-SHA-512", Version: 2}},
			saramaConfig: saramaSASLSCRAM512Config,
			err:          "invalid SASL Protocol Version",
		},
	}
	for _, test := range tests {
		t.Run("", func(t *testing.T) {
			config := &sarama.Config{}
			err := ConfigureAuthentication(test.auth, config)
			if test.err != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), test.err)
			} else {
				// equalizes SCRAMClientGeneratorFunc to do assertion with the same reference.
				config.Net.SASL.SCRAMClientGeneratorFunc = test.saramaConfig.Net.SASL.SCRAMClientGeneratorFunc
				assert.Equal(t, test.saramaConfig, config)
			}
		})
	}
}
