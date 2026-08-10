package service

import (
	"context"
	"errors"
	"regexp"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func preparePhoneAuthTest(t *testing.T) {
	t.Helper()
	require.NoError(t, model.DB.Exec("DELETE FROM tokens").Error)
	require.NoError(t, model.DB.Exec("DELETE FROM logs").Error)
	require.NoError(t, model.DB.Exec("DELETE FROM users").Error)

	originalSMSLoginEnabled := common.SmsLoginEnabled
	originalRegisterEnabled := common.RegisterEnabled
	originalSMSAutoRegisterEnabled := common.SmsAutoRegisterEnabled
	originalQuotaForNewUser := common.QuotaForNewUser
	originalGenerateDefaultToken := constant.GenerateDefaultToken
	t.Cleanup(func() {
		common.SmsLoginEnabled = originalSMSLoginEnabled
		common.RegisterEnabled = originalRegisterEnabled
		common.SmsAutoRegisterEnabled = originalSMSAutoRegisterEnabled
		common.QuotaForNewUser = originalQuotaForNewUser
		constant.GenerateDefaultToken = originalGenerateDefaultToken
	})
}

func TestPhoneAuthServiceLogsInExistingUserWhenRegistrationIsClosed(t *testing.T) {
	preparePhoneAuthTest(t)
	common.SmsLoginEnabled = true
	common.RegisterEnabled = false
	common.SmsAutoRegisterEnabled = false

	existing := &model.User{
		Username: "existing_phone_user",
		Phone:    "13800138000",
		Status:   common.UserStatusEnabled,
		Role:     common.RoleCommonUser,
	}
	require.NoError(t, model.DB.Create(existing).Error)

	verificationCalls := 0
	auth := NewPhoneAuthService(func(_ context.Context, phone string, code string) (bool, error) {
		verificationCalls++
		assert.Equal(t, "13800138000", phone)
		assert.Equal(t, "123456", code)
		return true, nil
	})

	result, err := auth.Authenticate(context.Background(), PhoneAuthInput{
		Phone:            " 13800138000 ",
		VerificationCode: "123456",
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, existing.Id, result.User.Id)
	assert.False(t, result.AccountCreated)
	assert.Equal(t, 1, verificationCalls)
}

func TestPhoneAuthServiceRejectsDisabledSMSLoginBeforeVerification(t *testing.T) {
	preparePhoneAuthTest(t)
	common.SmsLoginEnabled = false

	verificationCalled := false
	auth := NewPhoneAuthService(func(_ context.Context, _, _ string) (bool, error) {
		verificationCalled = true
		return true, nil
	})
	result, err := auth.Authenticate(context.Background(), PhoneAuthInput{
		Phone:            "13800138000",
		VerificationCode: "123456",
	})

	require.ErrorIs(t, err, ErrSMSLoginDisabled)
	assert.Nil(t, result)
	assert.False(t, verificationCalled)
}

func TestPhoneAuthServiceAutoRegistersOnlyOnce(t *testing.T) {
	preparePhoneAuthTest(t)
	common.SmsLoginEnabled = true
	common.RegisterEnabled = true
	common.SmsAutoRegisterEnabled = true
	common.QuotaForNewUser = 321
	constant.GenerateDefaultToken = true

	auth := NewPhoneAuthService(func(_ context.Context, _, _ string) (bool, error) {
		return true, nil
	})
	input := PhoneAuthInput{Phone: "13900139000", VerificationCode: "123456"}

	created, err := auth.Authenticate(context.Background(), input)
	require.NoError(t, err)
	require.True(t, created.AccountCreated)
	assert.Regexp(t, regexp.MustCompile(`^u_[0-9A-Za-z]{12}$`), created.User.Username)
	assert.Equal(t, created.User.Username, created.User.DisplayName)
	assert.Equal(t, "13900139000", created.User.Phone)
	assert.True(t, created.User.PhoneVerified)
	assert.Equal(t, 321, created.User.Quota)

	existing, err := auth.Authenticate(context.Background(), input)
	require.NoError(t, err)
	assert.False(t, existing.AccountCreated)
	assert.Equal(t, created.User.Id, existing.User.Id)

	var userCount int64
	var tokenCount int64
	require.NoError(t, model.DB.Model(&model.User{}).Where("phone = ?", input.Phone).Count(&userCount).Error)
	require.NoError(t, model.DB.Model(&model.Token{}).Where("user_id = ?", created.User.Id).Count(&tokenCount).Error)
	assert.Equal(t, int64(1), userCount)
	assert.Equal(t, int64(1), tokenCount)
}

func TestPhoneAuthServiceDoesNotQueryOrCreateBeforeVerification(t *testing.T) {
	preparePhoneAuthTest(t)
	common.SmsLoginEnabled = true
	common.RegisterEnabled = true
	common.SmsAutoRegisterEnabled = true

	auth := NewPhoneAuthService(func(_ context.Context, _, _ string) (bool, error) {
		return false, nil
	})

	result, err := auth.Authenticate(context.Background(), PhoneAuthInput{
		Phone:            "13700137000",
		VerificationCode: "wrong",
	})

	require.ErrorIs(t, err, ErrSMSVerificationFailed)
	assert.Nil(t, result)
	var count int64
	require.NoError(t, model.DB.Model(&model.User{}).Count(&count).Error)
	assert.Zero(t, count)
}

func TestPhoneAuthServiceMapsVerifierOutageSeparately(t *testing.T) {
	preparePhoneAuthTest(t)
	common.SmsLoginEnabled = true

	auth := NewPhoneAuthService(func(_ context.Context, _, _ string) (bool, error) {
		return false, errors.New("gateway timeout")
	})

	result, err := auth.Authenticate(context.Background(), PhoneAuthInput{
		Phone:            "13600136000",
		VerificationCode: "123456",
	})

	require.ErrorIs(t, err, ErrSMSServiceUnavailable)
	assert.Nil(t, result)
}

func TestPhoneAuthServiceRejectsUnavailableAccounts(t *testing.T) {
	preparePhoneAuthTest(t)
	common.SmsLoginEnabled = true
	common.RegisterEnabled = true
	common.SmsAutoRegisterEnabled = true

	deleted := &model.User{
		Username: "deleted_phone_user",
		Phone:    "13500135000",
		Status:   common.UserStatusEnabled,
		Role:     common.RoleCommonUser,
	}
	require.NoError(t, model.DB.Create(deleted).Error)
	require.NoError(t, model.DB.Delete(deleted).Error)

	auth := NewPhoneAuthService(func(_ context.Context, _, _ string) (bool, error) {
		return true, nil
	})
	result, err := auth.Authenticate(context.Background(), PhoneAuthInput{
		Phone:            deleted.Phone,
		VerificationCode: "123456",
	})

	require.ErrorIs(t, err, ErrPhoneAccountBlocked)
	assert.Nil(t, result)
	var count int64
	require.NoError(t, model.DB.Unscoped().Model(&model.User{}).Where("phone = ?", deleted.Phone).Count(&count).Error)
	assert.Equal(t, int64(1), count)
}

func TestPhoneAuthServiceRequiresBothRegistrationSwitches(t *testing.T) {
	tests := []struct {
		name                string
		registerEnabled     bool
		autoRegisterEnabled bool
	}{
		{name: "global registration disabled", registerEnabled: false, autoRegisterEnabled: true},
		{name: "SMS auto registration disabled", registerEnabled: true, autoRegisterEnabled: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			preparePhoneAuthTest(t)
			common.SmsLoginEnabled = true
			common.RegisterEnabled = tt.registerEnabled
			common.SmsAutoRegisterEnabled = tt.autoRegisterEnabled

			auth := NewPhoneAuthService(func(_ context.Context, _, _ string) (bool, error) {
				return true, nil
			})
			result, err := auth.Authenticate(context.Background(), PhoneAuthInput{
				Phone:            "13400134000",
				VerificationCode: "123456",
			})

			require.ErrorIs(t, err, ErrSMSRegistrationClosed)
			assert.Nil(t, result)
		})
	}
}
