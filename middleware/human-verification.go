package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

const humanVerificationSessionKey = "human_verification"

type turnstileCheckResponse struct {
	Success bool `json:"success"`
}

func HumanVerificationCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		if session.Get(humanVerificationSessionKey) != nil || session.Get("turnstile") != nil {
			c.Next()
			return
		}

		var err error
		switch common.GetHumanVerificationProvider() {
		case common.HumanVerificationProviderAliyun:
			err = verifyAliyunCaptcha(c)
		case common.HumanVerificationProviderTurnstile:
			err = verifyTurnstile(c)
		default:
			c.Next()
			return
		}

		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			c.Abort()
			return
		}

		session.Set(humanVerificationSessionKey, true)
		if err := session.Save(); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "无法保存人机验证状态，请重试",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func verifyAliyunCaptcha(c *gin.Context) error {
	captchaVerifyParam := c.Query("captcha_verify_param")
	if captchaVerifyParam == "" {
		return fmt.Errorf("验证码参数为空")
	}

	verified, err := common.VerifyAliyunCaptcha(c.Request.Context(), captchaVerifyParam)
	if err != nil {
		common.SysLog(fmt.Sprintf("Aliyun captcha verification failed: %v", err))
		return err
	}
	if !verified {
		return fmt.Errorf("验证码校验失败，请重试")
	}
	return nil
}

func verifyTurnstile(c *gin.Context) error {
	response := c.Query("turnstile")
	if response == "" {
		return fmt.Errorf("Turnstile token 为空")
	}

	rawRes, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", url.Values{
		"secret":   {common.TurnstileSecretKey},
		"response": {response},
		"remoteip": {c.ClientIP()},
	})
	if err != nil {
		common.SysLog(err.Error())
		return err
	}
	defer rawRes.Body.Close()

	var result turnstileCheckResponse
	if err := json.NewDecoder(rawRes.Body).Decode(&result); err != nil {
		common.SysLog(err.Error())
		return err
	}
	if !result.Success {
		return fmt.Errorf("Turnstile 校验失败，请刷新重试！")
	}
	return nil
}
