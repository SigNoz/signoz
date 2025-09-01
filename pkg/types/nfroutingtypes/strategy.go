package nfroutingtypes

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

// RoutingStrategy defines how alerts are routed for an organization
type RoutingStrategy string

const (
	// RuleBasedRouting uses the legacy ruleId-based routing system
	RuleBasedRouting RoutingStrategy = "rule"
	
	// ExpressionRouting uses the new expression-based routing system
	ExpressionRouting RoutingStrategy = "expression"
	
	// HybridRouting allows both systems with configurable precedence
	HybridRouting RoutingStrategy = "hybrid"
)

// RoutingPrecedence defines which routing system takes precedence in hybrid mode
type RoutingPrecedence string

const (
	// ExpressionFirst checks expression routes first, then rule routes
	ExpressionFirst RoutingPrecedence = "expression_first"
	
	// RuleFirst checks rule routes first, then expression routes
	RuleFirst RoutingPrecedence = "rule_first"
	
	// ExpressionOnly processes only expression routes in hybrid mode
	ExpressionOnly RoutingPrecedence = "expression_only"
	
	// RuleOnly processes only rule routes in hybrid mode
	RuleOnly RoutingPrecedence = "rule_only"
)

// OrgRoutingConfig stores routing configuration per organization
type OrgRoutingConfig struct {
	bun.BaseModel `bun:"table:org_routing_configs"`
	types.Identifiable
	types.TimeAuditable

	// Organization ID
	OrgID string `bun:"org_id,type:text,notnull,unique" json:"orgId"`
	
	// Primary routing strategy
	Strategy RoutingStrategy `bun:"strategy,type:text,notnull,default:'rule'" json:"strategy"`
	
	// Precedence for hybrid routing (only used when Strategy = HybridRouting)
	Precedence RoutingPrecedence `bun:"precedence,type:text,default:'expression_first'" json:"precedence,omitempty"`
	
	// Whether to continue processing after first match in hybrid mode
	ContinueOnMatch bool `bun:"continue_on_match,type:boolean,default:false" json:"continueOnMatch"`
	
	// Migration settings
	MigrationEnabled bool `bun:"migration_enabled,type:boolean,default:false" json:"migrationEnabled"`
	MigrationStrategy string `bun:"migration_strategy,type:text" json:"migrationStrategy,omitempty"`
}

// Validate validates the routing configuration
func (config *OrgRoutingConfig) Validate() error {
	switch config.Strategy {
	case RuleBasedRouting, ExpressionRouting, HybridRouting:
		// Valid strategies
	default:
		return fmt.Errorf("invalid routing strategy: %s", config.Strategy)
	}
	
	if config.Strategy == HybridRouting {
		switch config.Precedence {
		case ExpressionFirst, RuleFirst, ExpressionOnly, RuleOnly:
			// Valid precedence
		default:
			return fmt.Errorf("invalid routing precedence: %s", config.Precedence)
		}
	}
	
	return nil
}

// IsExpressionRoutingEnabled returns true if expression routing should be used
func (config *OrgRoutingConfig) IsExpressionRoutingEnabled() bool {
	switch config.Strategy {
	case ExpressionRouting:
		return true
	case HybridRouting:
		return config.Precedence == ExpressionFirst || config.Precedence == ExpressionOnly
	default:
		return false
	}
}

// IsRuleRoutingEnabled returns true if rule-based routing should be used
func (config *OrgRoutingConfig) IsRuleRoutingEnabled() bool {
	switch config.Strategy {
	case RuleBasedRouting:
		return true
	case HybridRouting:
		return config.Precedence == RuleFirst || config.Precedence == RuleOnly
	default:
		return false
	}
}

// ShouldContinueAfterMatch returns true if processing should continue after first match
func (config *OrgRoutingConfig) ShouldContinueAfterMatch() bool {
	if config.Strategy == HybridRouting {
		return config.ContinueOnMatch
	}
	// For single strategies, always continue to allow multiple routes to match
	return true
}

// GetDefaultConfig returns the default routing configuration for new organizations
func GetDefaultConfig(orgID string) *OrgRoutingConfig {
	return &OrgRoutingConfig{
		OrgID:           orgID,
		Strategy:        RuleBasedRouting, // Default to existing behavior
		Precedence:      ExpressionFirst,
		ContinueOnMatch: false,
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
	}
}

// RoutingConfigStore defines operations for managing routing configurations
type RoutingConfigStore interface {
	GetByOrgID(ctx context.Context, orgID string) (*OrgRoutingConfig, error)
	Create(ctx context.Context, config *OrgRoutingConfig) error
	Update(ctx context.Context, config *OrgRoutingConfig) error
	Delete(ctx context.Context, orgID string) error
	
	// Migration helpers
	GetOrgsUsingStrategy(ctx context.Context, strategy RoutingStrategy) ([]string, error)
	BulkUpdateStrategy(ctx context.Context, orgIDs []string, strategy RoutingStrategy) error
}

// RoutingDecision represents the routing decision made for an alert
type RoutingDecision struct {
	Strategy          RoutingStrategy   `json:"strategy"`
	UseExpressions    bool             `json:"useExpressions"`
	UseRules         bool             `json:"useRules"`
	ContinueOnMatch  bool             `json:"continueOnMatch"`
	MatchedRoutes    []string         `json:"matchedRoutes,omitempty"`
	Reason           string           `json:"reason,omitempty"`
}

// MakeRoutingDecision determines how an alert should be routed based on org config
func MakeRoutingDecision(config *OrgRoutingConfig, hasExpressionRoutes, hasRuleRoutes bool) *RoutingDecision {
	decision := &RoutingDecision{
		Strategy:        config.Strategy,
		ContinueOnMatch: config.ShouldContinueAfterMatch(),
	}
	
	switch config.Strategy {
	case RuleBasedRouting:
		decision.UseRules = hasRuleRoutes
		decision.UseExpressions = false
		decision.Reason = "Organization configured for rule-based routing only"
		
	case ExpressionRouting:
		decision.UseExpressions = hasExpressionRoutes
		decision.UseRules = false
		decision.Reason = "Organization configured for expression routing only"
		
	case HybridRouting:
		switch config.Precedence {
		case ExpressionFirst:
			if hasExpressionRoutes {
				decision.UseExpressions = true
				decision.UseRules = config.ContinueOnMatch && hasRuleRoutes
				decision.Reason = "Expression routes available, using expression-first precedence"
			} else {
				decision.UseExpressions = false
				decision.UseRules = hasRuleRoutes
				decision.Reason = "No expression routes available, falling back to rule routing"
			}
			
		case RuleFirst:
			if hasRuleRoutes {
				decision.UseRules = true
				decision.UseExpressions = config.ContinueOnMatch && hasExpressionRoutes
				decision.Reason = "Rule routes available, using rule-first precedence"
			} else {
				decision.UseRules = false
				decision.UseExpressions = hasExpressionRoutes
				decision.Reason = "No rule routes available, falling back to expression routing"
			}
			
		case ExpressionOnly:
			decision.UseExpressions = hasExpressionRoutes
			decision.UseRules = false
			decision.Reason = "Hybrid mode configured for expression-only processing"
			
		case RuleOnly:
			decision.UseRules = hasRuleRoutes
			decision.UseExpressions = false
			decision.Reason = "Hybrid mode configured for rule-only processing"
		}
	}
	
	return decision
}