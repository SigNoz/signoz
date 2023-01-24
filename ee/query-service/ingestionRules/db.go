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
func (r *Repo) InsertRule(ctx context.Context, postable *PostableIngestionRule) (*model.IngestionRule, error) {
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

// EditRule allows user initiated changes (from UI) in the rules
func (r *Repo) EditRule(ctx context.Context, editParams *IngestionRule) error {

	// 1. update edited rule and
	// 2. mark deploy status to Deploying
	// 3. reset deploy seq to -2 so this rule is picked up in next deploy cycle

	if editParams.Priority == 0 {
		// default priority of all rules is set to same number 1. so,
		// all rules will have same priority to start with.
		// user can chagne the priority to higher integer value to execute them first
		editParams.Priority = 1
	}

	rawConfig, err := json.Marshal(editParams.Config)
	if err != nil {
		return errors.Wrap(err, "failed to unmarshal edited ingestion rule config")
	}

	editQuery := `UPDATE ingestion_rules 
	SET name = $1,
	rule_subtype = $2,
	priority = $3,
	config_json = $4,
	WHERE id = $7`

	_, err = r.db.ExecContext(ctx,
		editQuery,
		editParams.Name,
		editParams.RuleSubType,
		editParams.Priority,
		string(rawConfig),
		editParams.Id)

	if err != nil {
		zap.S().Errorf("error in updating ingestion rule: ", zap.Error(err))
		return errors.Wrap(err, "failed to updated edit ingestion rule")
	}

	editParams.RawConfig = string(rawConfig)
	return nil
}

// GetDropRules returns drop rules and errors (if any)
func (r *Repo) GetDropRules(ctx context.Context) ([]model.IngestionRule, []error) {
	var errors []error
	dropRules := []model.IngestionRule{}

	dropRulesQuery := `SELECT id, 
		source, 
		priority, 
		rule_type, 
		rule_subtype, 
		name, 
		config_json, 
		deployment_status, 
		deployment_sequence 
		FROM ingestion_rules 
		WHERE rule_type=$1`

	err := r.db.SelectContext(ctx, &dropRules, dropRulesQuery, model.IngestionRuleTypeDrop)
	if err != nil {
		return nil, []error{fmt.Errorf("failed to get drop rules from db: %v", err)}
	}

	for _, d := range dropRules {
		if err := d.ParseRawConfig(); err != nil {
			errors = append(errors, err)
		}
	}

	return dropRules, errors
}

func (r *Repo) GetDropRulesByVersion(ctx context.Context, v float32) ([]model.IngestionRule, []error) {
	var errors []error
	rules := []model.IngestionRule{}

	versionQuery := `SELECT id, 
		source, 
		priority, 
		rule_type, 
		rule_subtype, 
		name, 
		config_json, 
		deployment_status, 
		deployment_sequence 
		FROM ingestion_rules r,
			 agent_config_elements e,
			 agent_config_versions v
		WHERE r.rule_type=e.element_type
		AND r.id = e.element_id
		AND v.id = e.version_id
		AND v.version = $1`

	err := r.db.SelectContext(ctx, &rules, versionQuery, v)
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

// GetDropRules returns drop rules and errors (if any)
func (r *Repo) GetRule(ctx context.Context, id string) (*model.IngestionRule, *model.ApiError) {
	rules := []model.IngestionRule{}

	ruleQuery := `SELECT id, 
		source, 
		priority, 
		rule_type, 
		rule_subtype, 
		name, 
		config_json, 
		deployment_status, 
		deployment_sequence  
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
