// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package textutils // import "github.com/open-telemetry/opentelemetry-collector-contrib/internal/coreinternal/textutils"

import (
	"errors"
	"fmt"
	"strings"

	"golang.org/x/text/encoding"
	"golang.org/x/text/encoding/ianaindex"
	"golang.org/x/text/encoding/unicode"
	"golang.org/x/text/transform"
)

// NewBasicConfig creates a new Encoding config
func NewEncodingConfig() EncodingConfig {
	return EncodingConfig{
		Encoding: "utf-8",
	}
}

// EncodingConfig is the configuration of a Encoding helper
type EncodingConfig struct {
	Encoding string `mapstructure:"encoding,omitempty"`
}

// Build will build an Encoding operator.
func (c EncodingConfig) Build() (Encoding, error) {
	enc, err := lookupEncoding(c.Encoding)
	if err != nil {
		return Encoding{}, err
	}

	return Encoding{
		Encoding:     enc,
		decodeBuffer: make([]byte, 1<<12),
		decoder:      enc.NewDecoder(),
	}, nil
}

type Encoding struct {
	Encoding     encoding.Encoding
	decoder      *encoding.Decoder
	decodeBuffer []byte
}

// Decode converts the bytes in msgBuf to utf-8 from the configured encoding
func (e *Encoding) Decode(msgBuf []byte) ([]byte, error) {
	for {
		e.decoder.Reset()
		nDst, _, err := e.decoder.Transform(e.decodeBuffer, msgBuf, true)
		if err == nil {
			return e.decodeBuffer[:nDst], nil
		}
		if errors.Is(err, transform.ErrShortDst) {
			e.decodeBuffer = make([]byte, len(e.decodeBuffer)*2)
			continue
		}
		return nil, fmt.Errorf("transform encoding: %w", err)
	}
}

var encodingOverrides = map[string]encoding.Encoding{
	"utf-16":   unicode.UTF16(unicode.LittleEndian, unicode.IgnoreBOM),
	"utf16":    unicode.UTF16(unicode.LittleEndian, unicode.IgnoreBOM),
	"utf-8":    unicode.UTF8,
	"utf8":     unicode.UTF8,
	"ascii":    unicode.UTF8,
	"us-ascii": unicode.UTF8,
	"nop":      encoding.Nop,
	"":         unicode.UTF8,
}

func lookupEncoding(enc string) (encoding.Encoding, error) {
	if e, ok := encodingOverrides[strings.ToLower(enc)]; ok {
		return e, nil
	}
	e, err := ianaindex.IANA.Encoding(enc)
	if err != nil {
		return nil, fmt.Errorf("unsupported encoding '%s'", enc)
	}
	if e == nil {
		return nil, fmt.Errorf("no charmap defined for encoding '%s'", enc)
	}
	return e, nil
}

func IsNop(enc string) bool {
	e, err := lookupEncoding(enc)
	if err != nil {
		return false
	}
	return e == encoding.Nop
}
