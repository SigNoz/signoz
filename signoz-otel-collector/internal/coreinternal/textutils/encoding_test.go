// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package textutils

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"golang.org/x/text/encoding"
	"golang.org/x/text/encoding/japanese"
	"golang.org/x/text/encoding/korean"
	"golang.org/x/text/encoding/simplifiedchinese"
	"golang.org/x/text/encoding/unicode"
)

func TestUTF8Encoding(t *testing.T) {
	tests := []struct {
		name         string
		encoding     encoding.Encoding
		encodingName string
	}{
		{
			name:         "UTF8 encoding",
			encoding:     unicode.UTF8,
			encodingName: "utf8",
		},
		{
			name:         "GBK encoding",
			encoding:     simplifiedchinese.GBK,
			encodingName: "gbk",
		},
		{
			name:         "SHIFT_JIS encoding",
			encoding:     japanese.ShiftJIS,
			encodingName: "shift_jis",
		},
		{
			name:         "EUC-KR encoding",
			encoding:     korean.EUCKR,
			encodingName: "euc-kr",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			encCfg := NewEncodingConfig()
			encCfg.Encoding = test.encodingName
			enc, err := encCfg.Build()
			assert.NoError(t, err)
			assert.Equal(t, test.encoding, enc.Encoding)
		})
	}
}
