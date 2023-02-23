package ingestionRules

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/ee/query-service/ingestionRules/sqlite"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.uber.org/zap"
)

// Repo handles DDL and DML ops on ingestion rules
type Repo struct {
	db *sqlx.DB
}

// NewRepo initiates a new ingestion repo
func NewRepo(db *sqlx.DB) Repo {
	return Repo{
		db: db,
	}
}

func (r *Repo) InitDB(engine string) error {
	switch engine {
	case "sqlite3", "sqlite":
		return sqlite.InitDB(r.db)
	default:
		return fmt.Errorf("unsupported db")
	}
}

// InsertRule stores a given postable rule to database
func (r *Repo) insertRule(ctx context.Context, postable *PostableIngestionRule) (*model.IngestionRule, error) {
	if err := postable.IsValid(); err != nil {
		return nil, errors.Wrap(err, "failed to validate postable ingestion rule")
	}

	if postable.Priority == 0 {
		// default priority of all rules is set to same number 1. so,
		// all rules will have same priority to start with.
		// user can chagne the priority to higher integer value to execute them first
		postable.Priority = 1
	}

	rawConfig, err := json.Marshal(postable.Config)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal postable ingestion config")
	}

	insertRow := &model.IngestionRule{
		Id:          uuid.New().String(),
		Name:        postable.Name,
		Source:      postable.Source,
		RuleType:    postable.RuleType,
		RuleSubType: postable.RuleSubType,
		Priority:    postable.Priority,
		Config:      postable.Config,
		RawConfig:   string(rawConfig),
	}

	insertQuery := `INSERT INTO ingestion_rules 
	(id, name, source, rule_type, rule_subtype, priority, config_json) 
	VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err = r.db.ExecContext(ctx,
		insertQuery,
		insertRow.Id,
		insertRow.Name,
		insertRow.Source,
		insertRow.RuleType,
		insertRow.RuleSubType,
		insertRow.Priority,
		insertRow.RawConfig)

	if err != nil {
		zap.S().Errorf("error in inserting ingestion rule data: ", zap.Error(err))
		return insertRow, errors.Wrap(err, "failed to insert ingestion rule")
	}

	return insertRow, nil
}

// getRulesByVersion returns rules associated with a given version
func (r *Repo) getRulesByVersion(ctx context.Context, version int) ([]model.IngestionRule, []error) {
	var errors []error
	rules := []model.IngestionRule{}

	versionQuery := `SELECT id, 
		source, 
		priority, 
		rule_type, 
		rule_subtype, 
		name, 
		config_json, 
		v.deployment_status, 
		v.deployment_sequence 
		FROM ingestion_rules r,
			 agent_config_elements e,
			 agent_config_versions v
		WHERE r.rule_type=e.element_type
		AND r.id = e.element_id
		AND v.id = e.version_id
		AND v.version = $1`

	err := r.db.SelectContext(ctx, &rules, versionQuery, version)
	if err != nil {
		return nil, []error{fmt.Errorf("failed to get drop rules from db: %v", err)}
	}

	if len(rules) == 0 {
		return rules, nil
	}

	for _, d := range rules {
		if err := d.ParseRawConfig(); err != nil {
			errors = append(errors, err)
		}
	}

	return rules, errors
}

// GetRule returns rules and errors (if any)
func (r *Repo) GetRule(ctx context.Context, id string) (*model.IngestionRule, *model.ApiError) {
	rules := []model.IngestionRule{}

	ruleQuery := `SELECT id, 
		source, 
		priority, 
		rule_type, 
		rule_subtype, 
		name, 
		config_json
		FROM ingestion_rules 
		WHERE id = $1`

	err := r.db.SelectContext(ctx, &rules, ruleQuery, id)
	if err != nil {
		zap.S().Errorf("failed to get ingestion rule from db", err)
		return nil, model.BadRequestStr("failed to get ingestion rule from db")
	}

	if len(rules) == 0 {
		zap.S().Warnf("No row found for ingestion rule id", id)
		return nil, nil
	}

	if len(rules) == 1 {
		err := rules[0].ParseRawConfig()
		if err != nil {
			zap.S().Errorf("invalid rule config found", id, err)
			return &rules[0], model.InternalErrorStr("found an invalid rule config ")
		}
		return &rules[0], nil
	}

	return nil, model.InternalErrorStr("mutliple rules with same id")

}

func (r *Repo) DeleteRule(ctx context.Context, id string) *model.ApiError {
	deleteQuery := `DELETE
		FROM ingestion_rules 
		WHERE id = $1`

	_, err := r.db.ExecContext(ctx, deleteQuery, id)
	if err != nil {
		return model.BadRequest(err)
	}

	return nil

}
