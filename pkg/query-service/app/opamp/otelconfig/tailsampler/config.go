package tailsampler

import "time"

type PolicyType string

type Config struct {
	DecisionWait            time.Duration `mapstructure:"decision_wait" yaml:"decision_wait"`
	NumTraces               uint64        `mapstructure:"num_traces" yaml:"num_traces"`
	ExpectedNewTracesPerSec uint64        `mapstructure:"expected_new_traces_per_sec" yaml:"expected_new_traces_per_sec"`
	PolicyCfgs              []PolicyCfg   `mapstructure:"policies" yaml:"policies"`

	// read only version number (optional)
	Version int
}

type ProbabilisticCfg struct {
	// HashSalt allows one to configure the hashing salts. This is important in scenarios where multiple layers of collectors
	// have different sampling rates: if they use the same salt all passing one layer may pass the other even if they have
	// different sampling rates, configuring different salts avoids that.
	HashSalt string `mapstructure:"hash_salt" yaml:"hash_salt"`
	// SamplingPercentage is the percentage rate at which traces are going to be sampled. Defaults to zero, i.e.: no sample.
	// Values greater or equal 100 are treated as "sample all traces".
	SamplingPercentage float64 `mapstructure:"sampling_percentage" yaml:"sampling_percentage"`
}

type NumericAttributeCfg struct {
	// Tag that the filter is going to be matching against.
	Key string `mapstructure:"key" yaml:"key"`
	// MinValue is the minimum value of the attribute to be considered a match.
	MinValue int64 `mapstructure:"min_value" yaml:"min_value"`
	// MaxValue is the maximum value of the attribute to be considered a match.
	MaxValue int64 `mapstructure:"max_value" yaml:"max_value"`
}

type StringAttributeCfg struct {
	// Tag that the filter is going to be matching against.
	Key string `mapstructure:"key" yaml:"key"`
	// Values indicate the set of values or regular expressions to use when matching against attribute values.
	// StringAttribute Policy will apply exact value match on Values unless EnabledRegexMatching is true.
	Values []string `mapstructure:"values" yaml:"values"`
	// EnabledRegexMatching determines whether match attribute values by regexp string.
	EnabledRegexMatching bool `mapstructure:"enabled_regex_matching" yaml:"enabled_regex_matching"`
	// CacheMaxSize is the maximum number of attribute entries of LRU Cache that stores the matched result
	// from the regular expressions defined in Values.
	// CacheMaxSize will not be used if EnabledRegexMatching is set to false.
	CacheMaxSize int `mapstructure:"cache_max_size" yaml:"cache_max_size"`
	// InvertMatch indicates that values or regular expressions must not match against attribute values.
	// If InvertMatch is true and Values is equal to 'acme', all other values will be sampled except 'acme'.
	// Also, if the specified Key does not match on any resource or span attributes, data will be sampled.
	InvertMatch bool `mapstructure:"invert_match" yaml:"invert_match"`
}

type PolicyFilterCfg struct {
	// values: AND | OR
	FilterOp string `mapstructure:"filter_op" yaml:"filter_op"`

	StringAttributeCfgs  []StringAttributeCfg  `mapstructure:"string_attributes" yaml:"string_attributes"`
	NumericAttributeCfgs []NumericAttributeCfg `mapstructure:"numeric_attributes" yaml:"numeric_attributes"`
}

// PolicyCfg identifies policy rules in policy group
type PolicyCfg struct {
	// name of the policy
	Name string `mapstructure:"name" yaml:"name"`

	// Type of the policy this will be used to match the proper configuration of the policy.
	Type PolicyType `mapstructure:"type" yaml:"type"`

	// Set to true for sampling rule (root) and false for conditions
	Root bool `mapstructure:"root" yaml:"root"`

	Priority int `mapstructure:"priority" yaml:"priority"`

	// sampling applied when  PolicyFilter matches
	ProbabilisticCfg `mapstructure:",squash" yaml:"sampling"`

	// filter to activate policy
	PolicyFilterCfg `mapstructure:",squash" yaml:"policy_filter"`

	SubPolicies []PolicyCfg `mapstructure:"sub_policies" yaml:"sub_policies"`
}
