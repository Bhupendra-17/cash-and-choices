package services

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/smtp"
	"strings"

	"cash-choices-server/config"
)

type EmailService struct {
	cfg *config.Config
}

func NewEmailService(cfg *config.Config) *EmailService {
	return &EmailService{cfg: cfg}
}

func (e *EmailService) IsSMTPConfigured() bool {
	return e.cfg != nil && strings.TrimSpace(e.cfg.SMTPHost) != "" && strings.TrimSpace(e.cfg.SMTPUsername) != ""
}

func (e *EmailService) SendOTPEmail(recipientEmail, otp string) error {
	if !e.IsSMTPConfigured() {
		log.Printf("📧 [OTP DEV FALLBACK] SMTP not configured. OTP for %s is: %s", recipientEmail, otp)
		return nil
	}

	from := e.cfg.SMTPFrom
	if from == "" {
		from = e.cfg.SMTPUsername
	}

	subject := "Subject: Cash&Choices — Verification Code\r\n"
	mime := "MIME-version: 1.0;\r\nContent-Type: text/html; charset=\"UTF-8\";\r\n\r\n"
	
	body := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .logo { font-size: 22px; font-weight: 700; color: #10b981; margin-bottom: 24px; text-align: center; }
    .title { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
    .otp-box { background: #f0fdf4; border: 1px solid #a7f3d0; color: #047857; font-size: 32px; font-weight: 800; letter-spacing: 6px; text-align: center; padding: 16px; border-radius: 12px; margin: 24px 0; }
    .footer { font-size: 12px; color: #64748b; margin-top: 32px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Cash&Choices</div>
    <div class="title">Your Verification Code</div>
    <p>Use the code below to complete your authentication process. This code will expire in 10 minutes.</p>
    <div class="otp-box">%s</div>
    <p>If you did not request this verification code, please ignore this email.</p>
    <div class="footer">
      &copy; Cash&Choices. Zero-affiliate, privacy-first personal finance guidance.
    </div>
  </div>
</body>
</html>`, otp)

	msg := []byte(fmt.Sprintf("From: %s\r\nTo: %s\r\n%s%s%s", from, recipientEmail, subject, mime, body))

	host := e.cfg.SMTPHost
	port := e.cfg.SMTPPort
	if port == "" {
		port = "587"
	}
	addr := fmt.Sprintf("%s:%s", host, port)

	auth := smtp.PlainAuth("", e.cfg.SMTPUsername, e.cfg.SMTPPassword, host)

	// If using port 465 (SSL/TLS direct)
	if port == "465" {
		tlsconfig := &tls.Config{
			InsecureSkipVerify: false,
			ServerName:         host,
		}
		conn, err := tls.Dial("tcp", addr, tlsconfig)
		if err != nil {
			log.Printf("⚠️ [SMTP ERROR] Failed TLS dial to %s: %v", addr, err)
			return fmt.Errorf("failed TLS connection to mail server: %w", err)
		}
		client, err := smtp.NewClient(conn, host)
		if err != nil {
			conn.Close()
			return fmt.Errorf("failed SMTP client init: %w", err)
		}
		defer client.Quit()

		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP auth failed: %w", err)
		}
		if err = client.Mail(from); err != nil {
			return fmt.Errorf("SMTP mail from failed: %w", err)
		}
		if err = client.Rcpt(recipientEmail); err != nil {
			return fmt.Errorf("SMTP rcpt failed: %w", err)
		}
		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("SMTP data writer failed: %w", err)
		}
		_, err = w.Write(msg)
		if err != nil {
			return fmt.Errorf("SMTP write body failed: %w", err)
		}
		_ = w.Close()
		log.Printf("✅ [SMTP SUCCESS] Sent OTP to %s via TLS 465", recipientEmail)
		return nil
	}

	// Standard STARTTLS (ports 587, 25)
	err := smtp.SendMail(addr, auth, from, []string{recipientEmail}, msg)
	if err != nil {
		log.Printf("⚠️ [SMTP ERROR] Failed to send email via STARTTLS: %v", err)
		return fmt.Errorf("failed to send email via SMTP: %w", err)
	}

	log.Printf("✅ [SMTP SUCCESS] OTP email successfully sent to %s", recipientEmail)
	return nil
}
