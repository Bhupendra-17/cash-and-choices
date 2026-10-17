package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLearningProfileRoutesRequireAuthentication(t *testing.T) {
	for _, test := range []struct {
		method string
		path   string
	}{
		{method: http.MethodGet, path: "/api/user/learning-profile"},
		{method: http.MethodPut, path: "/api/user/learning-profile"},
		{method: http.MethodDelete, path: "/api/auth/me"},
	} {
		request := httptest.NewRequest(test.method, test.path, nil)
		response := httptest.NewRecorder()
		Handler(response, request)
		if response.Code != http.StatusUnauthorized {
			t.Errorf("%s %s status = %d, want %d", test.method, test.path, response.Code, http.StatusUnauthorized)
		}
	}
}
