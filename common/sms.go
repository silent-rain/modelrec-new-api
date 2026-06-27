package common

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// VerifySMSCode 调用微服务验证短信验证码
// 返回 true 表示验证成功，error 包含详细错误信息
func VerifySMSCode(phone string, code string) (bool, error) {
	url := SMSAuthBaseURL + "/api/auth/sms/verify"

	body, _ := json.Marshal(map[string]string{
		"phone_number": phone,
		"code":  code,
	})

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return false, fmt.Errorf("创建请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("调用短信验证接口失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("读取响应失败: %w", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return false, fmt.Errorf("解析响应失败: %w", err)
	}

	// 记录微服务完整响应，用于调试
	SysLog(fmt.Sprintf("SMS verify response: %s", string(respBody)))

	// 响应格式: {"code": 0, "message": "ok", "data": {"success": true, "message": "验证成功"}}
	if data, ok := result["data"].(map[string]interface{}); ok {
		if success, ok := data["success"].(bool); ok && success {
			return true, nil
		}
		// 返回验证失败的具体原因（透传微服务错误信息）
		if msg, ok := data["message"].(string); ok && msg != "" {
			return false, fmt.Errorf("%s", msg)
		}
	}

	return false, fmt.Errorf("验证失败")
}
