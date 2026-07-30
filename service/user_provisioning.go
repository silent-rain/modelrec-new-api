package service

import (
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"gorm.io/gorm"
)

type ProvisionUserInput struct {
	Username       string
	Password       string
	DisplayName    string
	Email          string
	Phone          string
	PhoneVerified  bool
	InviterID      int
	CreationSource string
}

func generateProvisionedUsername() (string, error) {
	suffix, err := common.GenerateRandomCharsKey(12)
	if err != nil {
		return "", err
	}
	return "u_" + suffix, nil
}

func ProvisionUser(input ProvisionUserInput) (*model.User, error) {
	username := input.Username
	if username == "" {
		var err error
		username, err = generateProvisionedUsername()
		if err != nil {
			return nil, err
		}
	}

	displayName := input.DisplayName
	if displayName == "" {
		displayName = username
	}

	user := &model.User{
		Username:      username,
		Password:      input.Password,
		DisplayName:   displayName,
		Email:         input.Email,
		Phone:         input.Phone,
		PhoneVerified: input.PhoneVerified,
		InviterId:     input.InviterID,
		Role:          common.RoleCommonUser,
		Status:        common.UserStatusEnabled,
	}

	var defaultToken *model.Token
	if constant.GenerateDefaultToken {
		key, err := common.GenerateKey()
		if err != nil {
			return nil, err
		}
		defaultToken = &model.Token{
			Name:               username + "的初始令牌",
			Key:                key,
			CreatedTime:        common.GetTimestamp(),
			AccessedTime:       common.GetTimestamp(),
			ExpiredTime:        -1,
			RemainQuota:        500000,
			UnlimitedQuota:     true,
			ModelLimitsEnabled: false,
		}
		if setting.DefaultUseAutoGroup {
			defaultToken.Group = "auto"
		}
	}

	err := model.DB.Transaction(func(tx *gorm.DB) error {
		if err := user.InsertWithTx(tx, input.InviterID); err != nil {
			return err
		}

		if input.InviterID != 0 && operation_setting.IsPaymentComplianceConfirmed() {
			if common.QuotaForInvitee > 0 {
				if err := tx.Model(&model.User{}).Where("id = ?", user.Id).
					Update("quota", gorm.Expr("quota + ?", common.QuotaForInvitee)).Error; err != nil {
					return err
				}
				user.Quota += common.QuotaForInvitee
			}
			if common.QuotaForInviter > 0 {
				updates := map[string]any{
					"aff_count":   gorm.Expr("aff_count + ?", 1),
					"aff_quota":   gorm.Expr("aff_quota + ?", common.QuotaForInviter),
					"aff_history": gorm.Expr("aff_history + ?", common.QuotaForInviter),
				}
				if err := tx.Model(&model.User{}).Where("id = ?", input.InviterID).Updates(updates).Error; err != nil {
					return err
				}
			}
		}

		if defaultToken != nil {
			defaultToken.UserId = user.Id
			if err := defaultToken.InsertWithTx(tx); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if model.LOG_DB != nil {
		if common.QuotaForNewUser > 0 {
			model.RecordLog(user.Id, model.LogTypeSystem, fmt.Sprintf("新用户注册赠送 %s", logger.LogQuota(common.QuotaForNewUser)))
		}
		if input.InviterID != 0 && operation_setting.IsPaymentComplianceConfirmed() {
			if common.QuotaForInvitee > 0 {
				model.RecordLog(user.Id, model.LogTypeSystem, fmt.Sprintf("使用邀请码赠送 %s", logger.LogQuota(common.QuotaForInvitee)))
			}
			if common.QuotaForInviter > 0 {
				model.RecordLog(input.InviterID, model.LogTypeSystem, fmt.Sprintf("邀请用户赠送 %s", logger.LogQuota(common.QuotaForInviter)))
			}
		}
		if input.CreationSource != "" {
			model.RecordLog(user.Id, model.LogTypeSystem, "Created account via "+input.CreationSource)
		}
	}

	return user, nil
}
