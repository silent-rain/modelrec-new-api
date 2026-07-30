package controller

import (
	"errors"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type SMSLoginCodeRequest struct {
	Phone string `json:"phone"`
}

type SMSLoginRequest struct {
	Phone            string `json:"phone"`
	VerificationCode string `json:"verification_code"`
	AffiliateCode    string `json:"aff_code"`
}

var phoneAuthService = service.NewPhoneAuthService(common.VerifySMSCodeWithContext)

func phoneAuthError(c *gin.Context, code string, messageKey string) {
	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"code":    code,
		"message": i18n.T(c, messageKey),
	})
}

func SendSMSLoginCode(c *gin.Context) {
	registrationCanSendSMS := common.RegisterEnabled && common.PasswordRegisterEnabled
	if !common.SmsLoginEnabled && !registrationCanSendSMS {
		phoneAuthError(c, "SMS_LOGIN_DISABLED", i18n.MsgPhoneLoginDisabled)
		return
	}

	var request SMSLoginCodeRequest
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	phone, err := common.NormalizeMainlandChinaPhone(request.Phone)
	if err != nil {
		phoneAuthError(c, "INVALID_PHONE", i18n.MsgInvalidPhone)
		return
	}
	gatewayContext := common.WithSMSGatewayClientIP(c.Request.Context(), c.ClientIP())
	if err := common.SendLoginSMSCode(gatewayContext, phone); err != nil {
		common.SysLog("SMS login code send failed: " + err.Error())
		phoneAuthError(c, "SMS_SERVICE_UNAVAILABLE", i18n.MsgSMSSendFailed)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"cooldown_seconds": 60,
		},
	})
}

func SMSLogin(c *gin.Context) {
	var request SMSLoginRequest
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	completePhoneAuthentication(c, service.PhoneAuthInput{
		Phone:            request.Phone,
		VerificationCode: request.VerificationCode,
		AffiliateCode:    request.AffiliateCode,
	})
}

// handlePhoneLogin preserves the old /api/user/login phone contract during migration.
func handlePhoneLogin(c *gin.Context, phone string, code string) {
	completePhoneAuthentication(c, service.PhoneAuthInput{
		Phone:            phone,
		VerificationCode: code,
	})
}

func completePhoneAuthentication(c *gin.Context, input service.PhoneAuthInput) {
	gatewayContext := common.WithSMSGatewayClientIP(c.Request.Context(), c.ClientIP())
	result, err := phoneAuthService.Authenticate(gatewayContext, input)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrSMSLoginDisabled):
			phoneAuthError(c, "SMS_LOGIN_DISABLED", i18n.MsgPhoneLoginDisabled)
		case errors.Is(err, service.ErrSMSVerificationFailed):
			phoneAuthError(c, "SMS_CODE_INVALID_OR_EXPIRED", i18n.MsgUserVerificationCodeError)
		case errors.Is(err, service.ErrSMSServiceUnavailable):
			phoneAuthError(c, "SMS_SERVICE_UNAVAILABLE", i18n.MsgSMSVerifyFailed)
		case errors.Is(err, service.ErrSMSRegistrationClosed):
			phoneAuthError(c, "REGISTRATION_DISABLED", i18n.MsgPhoneRegisterDisabled)
		case errors.Is(err, service.ErrPhoneAccountBlocked):
			phoneAuthError(c, "ACCOUNT_UNAVAILABLE", i18n.MsgAuthUserBanned)
		default:
			common.ApiError(c, err)
		}
		return
	}

	user := result.User
	if model.IsTwoFAEnabled(user.Id) {
		session := sessions.Default(c)
		session.Set("pending_username", user.Username)
		session.Set("pending_user_id", user.Id)
		session.Set("pending_login_method", "sms")
		if err := session.Save(); err != nil {
			common.ApiErrorI18n(c, i18n.MsgUserSessionSaveFailed)
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message": i18n.T(c, i18n.MsgUserRequire2FA),
			"success": true,
			"data": gin.H{
				"require_2fa": true,
			},
		})
		return
	}

	setupLoginWithMeta(user, c, LoginMeta{
		Method:         "sms",
		AccountCreated: result.AccountCreated,
	})
}
