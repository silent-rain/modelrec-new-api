package common

import (
	"errors"
	"regexp"
	"strings"
)

var mainlandChinaPhonePattern = regexp.MustCompile(`^1[3-9]\d{9}$`)

// NormalizeMainlandChinaPhone validates and normalizes a mainland China mobile number.
func NormalizeMainlandChinaPhone(phone string) (string, error) {
	normalized := strings.TrimSpace(phone)
	if !mainlandChinaPhonePattern.MatchString(normalized) {
		return "", errors.New("invalid mainland China phone number")
	}
	return normalized, nil
}

func IsValidMainlandChinaPhone(phone string) bool {
	_, err := NormalizeMainlandChinaPhone(phone)
	return err == nil
}
