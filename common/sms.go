package common

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	loginSMSSignName     = "速通互联验证码"
	loginSMSTemplateCode = "100001"
	smsCodeInvalid       = 10294
	smsCodeExpired       = 10295
	smsCodeNotFound      = 10296
)

type smsGatewayResponse struct {
	Code    *int   `json:"code"`
	Message string `json:"message"`
}

type smsGatewayClientIPContextKey struct{}

// WithSMSGatewayClientIP preserves the browser IP across the Go-to-Rust hop so
// the SMS gateway's IP rate limits do not collapse all requests onto the Go server IP.
func WithSMSGatewayClientIP(ctx context.Context, clientIP string) context.Context {
	clientIP = strings.TrimSpace(clientIP)
	if clientIP == "" {
		return ctx
	}
	return context.WithValue(ctx, smsGatewayClientIPContextKey{}, clientIP)
}

func callSMSGateway(ctx context.Context, path string, payload map[string]string) (smsGatewayResponse, error) {
	body, err := Marshal(payload)
	if err != nil {
		return smsGatewayResponse{}, fmt.Errorf("构造短信服务请求失败: %w", err)
	}

	url := strings.TrimRight(ModelHubBaseURL, "/") + path
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return smsGatewayResponse{}, fmt.Errorf("创建请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if clientIP, ok := ctx.Value(smsGatewayClientIPContextKey{}).(string); ok {
		req.Header.Set("X-Forwarded-For", clientIP)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return smsGatewayResponse{}, fmt.Errorf("调用短信服务失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return smsGatewayResponse{}, fmt.Errorf("读取短信服务响应失败: %w", err)
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return smsGatewayResponse{}, fmt.Errorf("短信服务返回异常状态: %d", resp.StatusCode)
	}

	var result smsGatewayResponse
	if err := Unmarshal(respBody, &result); err != nil {
		return smsGatewayResponse{}, fmt.Errorf("解析短信服务响应失败: %w", err)
	}
	if result.Code == nil {
		return smsGatewayResponse{}, fmt.Errorf("短信服务响应缺少业务状态码")
	}
	return result, nil
}

func SendLoginSMSCode(ctx context.Context, phone string) error {
	result, err := callSMSGateway(ctx, "/api/v2/auth/sms/send", map[string]string{
		"phone_number":  phone,
		"sign_name":     loginSMSSignName,
		"template_code": loginSMSTemplateCode,
	})
	if err != nil {
		return err
	}
	if *result.Code == 0 {
		return nil
	}
	if strings.TrimSpace(result.Message) == "" {
		return fmt.Errorf("短信服务请求失败")
	}
	return fmt.Errorf("%s", result.Message)
}

// VerifySMSCodeWithContext calls the SMS service to verify a user-provided code.
func VerifySMSCodeWithContext(ctx context.Context, phone string, code string) (bool, error) {
	result, err := callSMSGateway(ctx, "/api/v2/auth/sms/verify", map[string]string{
		"phone_number": phone,
		"code":         code,
	})
	if err != nil {
		return false, err
	}
	switch *result.Code {
	case 0:
		return true, nil
	case smsCodeInvalid, smsCodeExpired, smsCodeNotFound:
		return false, nil
	default:
		return false, fmt.Errorf("短信服务校验失败，业务码: %d", *result.Code)
	}
}

// VerifySMSCode keeps the existing call sites compatible.
func VerifySMSCode(phone string, code string) (bool, error) {
	return VerifySMSCodeWithContext(context.Background(), phone, code)
}
