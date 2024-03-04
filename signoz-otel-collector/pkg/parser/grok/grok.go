package grok

import (
	"context"
	"fmt"

	"go.uber.org/zap"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/entry"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/operator"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/operator/helper"
	"github.com/vjeantet/grok"
)

const operatorType = "grok_parser"

func init() {
	operator.Register(operatorType, func() operator.Builder { return NewConfig() })
}

// NewConfig creates a new grok parser config with default values
func NewConfig() *Config {
	return NewConfigWithID(operatorType)
}

// NewConfigWithID creates a new grok parser config with default values
func NewConfigWithID(operatorID string) *Config {
	return &Config{
		ParserConfig: helper.NewParserConfig(operatorID, operatorType),
	}
}

// Config is the configuration of a grok parser operator.
type Config struct {
	helper.ParserConfig `mapstructure:",squash"`

	// grok pattern
	Pattern string `mapstructure:"pattern"`

	Cache struct {
		Size uint16 `mapstructure:"size"`
	} `mapstructure:"cache"`

	// array of keys that will be present in the final values
	Include []string `mapstructure:"include"`

	// array of keys that will be removed from the final values
	Exclude []string `mapstructure:"exclude"`
}

// Build will build a grok parser operator.
func (c Config) Build(logger *zap.SugaredLogger) (operator.Operator, error) {
	parserOperator, err := c.ParserConfig.Build(logger)
	if err != nil {
		return nil, err
	}

	if c.Pattern == "" {
		return nil, fmt.Errorf("missing required field 'pattern'")
	}

	g, err := grok.NewWithConfig(&grok.Config{NamedCapturesOnly: true})
	if err != nil {
		return nil, fmt.Errorf("new grok object: %w", err)
	}

	include := make(map[string]struct{})
	exclude := make(map[string]struct{})
	includeKeysPresent := false
	excludeKeysPresent := false
	if c.Include != nil && len(c.Include) > 0 {
		includeKeysPresent = true
		for _, k := range c.Include {
			include[k] = struct{}{}
		}
	}
	if c.Exclude != nil && len(c.Exclude) > 0 {
		excludeKeysPresent = true
		for _, k := range c.Exclude {
			exclude[k] = struct{}{}
		}
	}

	op := &Parser{
		ParserOperator:     parserOperator,
		grok:               g,
		pattern:            c.Pattern,
		includeKeysPresent: includeKeysPresent,
		include:            include,
		excludeKeysPresent: excludeKeysPresent,
		exclude:            exclude,
	}

	if c.Cache.Size > 0 {
		op.cache = newMemoryCache(c.Cache.Size, 0)
		logger.Debugf("configured %s with memory cache of size %d", op.ID(), op.cache.maxSize())
	}

	return op, nil
}

// Parser is an operator that parses grok in an entry.
type Parser struct {
	helper.ParserOperator
	grok               *grok.Grok
	pattern            string
	cache              cache
	includeKeysPresent bool
	include            map[string]struct{}
	excludeKeysPresent bool
	exclude            map[string]struct{}
}

// Process will parse an entry for grok.
func (r *Parser) Process(ctx context.Context, entry *entry.Entry) error {
	return r.ParserOperator.ProcessWith(ctx, entry, r.parse)
}

// parse will parse a value using the supplied grok.
func (r *Parser) parse(value interface{}) (interface{}, error) {
	var raw string
	switch m := value.(type) {
	case string:
		raw = m
	default:
		return nil, fmt.Errorf("type '%T' cannot be parsed as grok", value)
	}
	return r.match(raw)
}

func (r *Parser) match(value string) (interface{}, error) {
	if r.cache != nil {
		if x := r.cache.get(value); x != nil {
			return x, nil
		}
	}

	values, err := r.grok.ParseTyped(r.pattern, value)
	if err != nil {
		return nil, fmt.Errorf("failed to parse log: %v", err.Error())
	}

	parsedValues := map[string]interface{}{}
	for k, v := range values {
		if r.excludeKeysPresent {
			if _, ok := r.exclude[k]; ok {
				continue
			}
		}
		if r.includeKeysPresent {
			if _, ok := r.include[k]; ok {
				parsedValues[k] = v
			}
		} else {
			parsedValues[k] = v
		}
	}

	if r.cache != nil {
		r.cache.add(value, parsedValues)
	}

	return parsedValues, nil
}
