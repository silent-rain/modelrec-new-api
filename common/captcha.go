package common

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type aliyunCaptchaVerifyRequest struct {
	CaptchaVerifyParam string `json:"captcha_verify_param"`
	SceneID            string `json:"scene_id,omitempty"`
}

type aliyunCaptchaVerifyResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

const (
	HumanVerificationProviderNone      = "none"
	HumanVerificationProviderTurnstile = "turnstile"
	HumanVerificationProviderAliyun    = "aliyun"
)

// IsAliyunCaptchaPublicConfigComplete reports whether all public client
// parameters are available. Access keys stay in the Rust service and are never
// exposed by Go.
func IsAliyunCaptchaPublicConfigComplete() bool {
	region := strings.TrimSpace(AliyunCaptchaRegion)
	return (region == "cn" || region == "sgp") &&
		strings.TrimSpace(AliyunCaptchaPrefix) != "" &&
		strings.TrimSpace(AliyunCaptchaSceneID) != ""
}

func IsAliyunCaptchaConfigured() bool {
	return AliyunCaptchaEnabled && IsAliyunCaptchaPublicConfigComplete()
}

func GetHumanVerificationProvider() string {
	switch strings.ToLower(strings.TrimSpace(HumanVerificationProvider)) {
	case HumanVerificationProviderAliyun:
		return HumanVerificationProviderAliyun
	case HumanVerificationProviderTurnstile:
		return HumanVerificationProviderTurnstile
	case HumanVerificationProviderNone:
		return HumanVerificationProviderNone
	}

	// Backward compatibility for installations that still use the former
	// provider-specific enable flags and have not saved the unified option yet.
	if IsAliyunCaptchaConfigured() {
		return HumanVerificationProviderAliyun
	}
	if TurnstileCheckEnabled {
		return HumanVerificationProviderTurnstile
	}
	return HumanVerificationProviderNone
}

// VerifyAliyunCaptcha delegates server-side verification to model-hub-rs.
// captchaVerifyParam is single-use and must be forwarded without modification.
func VerifyAliyunCaptcha(ctx context.Context, captchaVerifyParam string) (bool, error) {
	if strings.TrimSpace(captchaVerifyParam) == "" {
		return false, fmt.Errorf("验证码参数为空")
	}

	payload, err := json.Marshal(aliyunCaptchaVerifyRequest{
		CaptchaVerifyParam: captchaVerifyParam,
		SceneID:            AliyunCaptchaSceneID,
	})
	if err != nil {
		return false, fmt.Errorf("构造验证码请求失败: %w", err)
	}

	endpoint := strings.TrimRight(ModelHubBaseURL, "/") + "/api/v2/auth/captcha/verify"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return false, fmt.Errorf("创建验证码请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("调用验证码服务失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return false, fmt.Errorf("读取验证码响应失败: %w", err)
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return false, fmt.Errorf("验证码服务返回异常状态: %d", resp.StatusCode)
	}

	var result aliyunCaptchaVerifyResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return false, fmt.Errorf("解析验证码响应失败: %w", err)
	}
	if result.Code != 0 {
		if strings.TrimSpace(result.Message) == "" {
			return false, fmt.Errorf("验证码校验失败")
		}
		return false, fmt.Errorf("%s", result.Message)
	}

	return true, nil
}
