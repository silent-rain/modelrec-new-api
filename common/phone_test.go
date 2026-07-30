package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeMainlandChinaPhone(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		expected  string
		shouldErr bool
	}{
		{name: "valid", input: "13800138000", expected: "13800138000"},
		{name: "trims surrounding whitespace", input: " 13800138000 ", expected: "13800138000"},
		{name: "rejects invalid prefix", input: "12800138000", shouldErr: true},
		{name: "rejects international format", input: "+8613800138000", shouldErr: true},
		{name: "rejects wrong length", input: "1380013800", shouldErr: true},
		{name: "rejects letters", input: "1380013800a", shouldErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			phone, err := NormalizeMainlandChinaPhone(tt.input)
			if tt.shouldErr {
				require.Error(t, err)
				assert.Empty(t, phone)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.expected, phone)
		})
	}
}
