package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

var (
	ErrSMSLoginDisabled      = errors.New("SMS login is disabled")
	ErrSMSVerificationFailed = errors.New("SMS verification failed")
	ErrSMSServiceUnavailable = errors.New("SMS service is unavailable")
	ErrSMSRegistrationClosed = errors.New("SMS registration is disabled")
	ErrPhoneAccountBlocked   = errors.New("phone account is unavailable")
)

type SMSCodeVerifier func(ctx context.Context, phone string, code string) (bool, error)

type PhoneAuthInput struct {
	Phone            string
	VerificationCode string
	AffiliateCode    string
}

type PhoneAuthResult struct {
	User           *model.User
	AccountCreated bool
}

type PhoneAuthService struct {
	verifyCode SMSCodeVerifier
}

func NewPhoneAuthService(verifyCode SMSCodeVerifier) *PhoneAuthService {
	return &PhoneAuthService{verifyCode: verifyCode}
}

func (s *PhoneAuthService) Authenticate(ctx context.Context, input PhoneAuthInput) (*PhoneAuthResult, error) {
	if !common.SmsLoginEnabled {
		return nil, ErrSMSLoginDisabled
	}

	phone, err := common.NormalizeMainlandChinaPhone(input.Phone)
	if err != nil || input.VerificationCode == "" {
		return nil, ErrSMSVerificationFailed
	}

	valid, err := s.verifyCode(ctx, phone, input.VerificationCode)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrSMSServiceUnavailable, err)
	}
	if !valid {
		return nil, ErrSMSVerificationFailed
	}

	user, err := model.GetUserByPhoneUnscoped(phone)
	if err == nil {
		if user.DeletedAt.Valid || user.Status != common.UserStatusEnabled {
			return nil, ErrPhoneAccountBlocked
		}
		return &PhoneAuthResult{User: user}, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if !common.RegisterEnabled || !common.SmsAutoRegisterEnabled {
		return nil, ErrSMSRegistrationClosed
	}

	inviterID, _ := model.GetUserIdByAffCode(input.AffiliateCode)
	user, err = ProvisionUser(ProvisionUserInput{
		Phone:          phone,
		PhoneVerified:  true,
		InviterID:      inviterID,
		CreationSource: "sms_auto_registration",
	})
	if err == nil {
		return &PhoneAuthResult{User: user, AccountCreated: true}, nil
	}

	// A concurrent request may have created the same phone account first.
	concurrentUser, findErr := model.GetUserByPhoneUnscoped(phone)
	if findErr == nil && !concurrentUser.DeletedAt.Valid && concurrentUser.Status == common.UserStatusEnabled {
		return &PhoneAuthResult{User: concurrentUser}, nil
	}
	return nil, err
}
