package services

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	htmltemplate "html/template"
	"mime"
	"net/mail"
	"net/smtp"
	"net/url"
	"strings"
	"text/template"
	"time"
)

const moneyByteHTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>{{.Edition.Subject}}</title></head>
<body style="margin:0;background:#f6f2f8;color:#29202d;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">{{.Edition.Preheader}}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f2f8;padding:24px 10px">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="padding:30px 28px;background:#d83f9d;background-image:linear-gradient(120deg,#ef3e9d,#ad45d4);color:#fff">
<div style="font-size:12px;font-weight:bold;letter-spacing:2px">CASH&amp;CHOICES · THE MONEY BYTE</div>
<h1 style="font-size:30px;line-height:1.2;margin:16px 0 8px">Money, without the fine print.</h1>
<p style="font-size:14px;margin:0">Your weekly financial clarity brief · {{.IssueDate}}</p>
</td></tr>
<tr><td style="padding:28px">
<p style="color:#ed3f9f;font-size:11px;font-weight:bold;letter-spacing:1px">01 / MONEY TERM OF THE WEEK</p>
<p style="margin:0;color:#b445d2;font-size:12px;font-weight:bold">{{.Edition.Term.Category}}</p>
<h2 style="font-size:25px;margin:8px 0">{{.Edition.Term.Name}}</h2>
<p style="color:#6d6472;line-height:1.8">{{.Edition.Term.Definition}}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:16px;background:#fbf1fa;border-radius:10px">
<tr><td><strong>When is it charged or deducted?</strong><p style="color:#6d6472;line-height:1.7;margin-bottom:14px">{{.Edition.Term.WhenCharged}}</p>
<strong>A simple example</strong><p style="color:#6d6472;line-height:1.7;margin-bottom:0">{{.Edition.Term.Example}}</p></td></tr>
</table>
<h3 style="font-size:18px">How can you reduce or avoid it?</h3>
<ol style="color:#6d6472;line-height:1.7">{{range .Edition.Term.HowToAvoid}}<li>{{.}}</li>{{end}}</ol>
<p><a href="{{.Edition.Term.OfficialURL}}" style="color:#b445d2;font-weight:bold">Verify the details with an official source</a></p>
<hr style="border:0;border-top:1px solid #ede5ef;margin:30px 0">
<p style="color:#ed3f9f;font-size:11px;font-weight:bold;letter-spacing:1px">02 / THIS WEEK IN MONEY</p>
<h2 style="font-size:25px">The stories worth your attention</h2>
{{range .Edition.Stories}}
<div style="padding:16px 0;border-bottom:1px solid #ede5ef">
<p style="color:#b445d2;font-size:11px;font-weight:bold;text-transform:uppercase">{{.Category}}</p>
<h3 style="font-size:19px;line-height:1.4;margin:8px 0">{{.Title}}</h3>
<p style="color:#6d6472;line-height:1.7">{{.Summary}}</p>
<p style="font-size:14px;line-height:1.7"><strong>Why it matters:</strong> {{.WhyItMatters}}</p>
<p style="font-size:12px">Source: <a href="{{.SourceURL}}" style="color:#b445d2">{{.SourceName}}</a></p>
</div>{{end}}
<div style="margin-top:26px;padding:20px;border-radius:10px;background:#f7f2fa">
<h3 style="font-size:18px;margin-top:0">Your 60-second money check</h3>
<p style="color:#6d6472;line-height:1.7;margin-bottom:0">{{.Edition.ActionOfTheWeek}}</p>
</div>
<p style="text-align:center;padding:24px 0"><a href="{{.SiteURL}}" style="display:inline-block;background:#ed3f9f;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Explore Cash&amp;Choices</a></p>
<hr style="border:0;border-top:1px solid #ede5ef">
<p style="color:#6d6472;font-size:11px;line-height:1.8;text-align:center">{{.Edition.Footer}} Always verify charges, rates, and rules with the relevant provider or official authority.</p>
<p style="color:#6d6472;font-size:11px;text-align:center">You received this because you subscribed to The Money Byte.</p>
<p style="font-size:11px;text-align:center"><a href="{{.UnsubscribeURL}}" style="color:#b445d2">Unsubscribe</a> · <a href="{{.SiteURL}}/privacy" style="color:#b445d2">Privacy policy</a></p>
</td></tr></table></td></tr></table></body></html>`

func (e *EmailService) PublicSiteURL() string {
	if e == nil || e.cfg == nil {
		return ""
	}
	return strings.TrimRight(strings.TrimSpace(e.cfg.PublicSiteURL), "/")
}

func (e *EmailService) PublicAPIURL() string {
	if e == nil || e.cfg == nil {
		return ""
	}
	return strings.TrimRight(strings.TrimSpace(e.cfg.PublicAPIURL), "/")
}

type moneyByteEmailData struct {
	Edition        NewsletterEdition
	IssueDate      string
	SiteURL        string
	UnsubscribeURL string
}

func RenderMoneyByteEmail(edition NewsletterEdition, siteURL, unsubscribeURL string) (string, string, error) {
	site, err := url.Parse(siteURL)
	if err != nil || site.Scheme != "https" || site.Host == "" {
		return "", "", fmt.Errorf("public site URL must be a valid HTTPS URL")
	}
	unsubscribe, err := url.Parse(unsubscribeURL)
	if err != nil || unsubscribe.Scheme != "https" || unsubscribe.Host == "" {
		return "", "", fmt.Errorf("unsubscribe URL must be a valid HTTPS URL")
	}
	date := edition.WeekStart
	if parsed, err := time.Parse("2006-01-02", edition.WeekStart); err == nil {
		date = parsed.Format("January 2, 2006")
	}
	data := moneyByteEmailData{
		Edition: edition, IssueDate: date,
		SiteURL:        strings.TrimRight(siteURL, "/"),
		UnsubscribeURL: unsubscribeURL,
	}
	html, err := htmltemplate.New("money-byte").Parse(moneyByteHTML)
	if err != nil {
		return "", "", fmt.Errorf("could not prepare Money Byte email: %w", err)
	}
	var htmlBody bytes.Buffer
	if err := html.Execute(&htmlBody, data); err != nil {
		return "", "", fmt.Errorf("could not render Money Byte email: %w", err)
	}
	plainTemplate, err := template.New("money-byte-text").Parse(`THE MONEY BYTE · CASH&CHOICES
{{.Edition.Subject}}
{{.Edition.Preheader}}
Your weekly financial clarity brief · {{.IssueDate}}

01 / MONEY TERM OF THE WEEK
{{.Edition.Term.Name}} ({{.Edition.Term.Category}})
{{.Edition.Term.Definition}}
When charged: {{.Edition.Term.WhenCharged}}
Example: {{.Edition.Term.Example}}
How to reduce or avoid it:
{{range .Edition.Term.HowToAvoid}}- {{.}}
{{end}}Official details: {{.Edition.Term.OfficialURL}}

02 / THIS WEEK IN MONEY
{{range .Edition.Stories}}{{.Category}} — {{.Title}}
{{.Summary}}
Why it matters: {{.WhyItMatters}}
Source: {{.SourceName}} — {{.SourceURL}}

{{end}}YOUR 60-SECOND MONEY CHECK
{{.Edition.ActionOfTheWeek}}

{{.Edition.Footer}}
Educational content only. Not financial advice. Always verify charges, rates, and rules with the relevant provider or official authority.

You received this because you subscribed to The Money Byte.
Unsubscribe: {{.UnsubscribeURL}}
Privacy policy: {{.SiteURL}}/privacy
`)
	if err != nil {
		return "", "", fmt.Errorf("could not prepare Money Byte text email: %w", err)
	}
	var textBody bytes.Buffer
	if err := plainTemplate.Execute(&textBody, data); err != nil {
		return "", "", fmt.Errorf("could not render Money Byte text email: %w", err)
	}
	return htmlBody.String(), textBody.String(), nil
}

func (e *EmailService) SendNewsletterEmail(recipient, subject, unsubscribeURL, htmlBody, textBody string) error {
	if !e.IsSMTPConfigured() || strings.TrimSpace(e.cfg.SMTPPassword) == "" {
		return fmt.Errorf("SMTP is not fully configured")
	}
	if strings.ContainsAny(subject, "\r\n") {
		return fmt.Errorf("email subject contains invalid line breaks")
	}
	toAddress, err := mail.ParseAddress(recipient)
	if err != nil || toAddress.Address != recipient {
		return fmt.Errorf("invalid newsletter recipient address")
	}
	from := strings.TrimSpace(e.cfg.SMTPFrom)
	if from == "" {
		from = strings.TrimSpace(e.cfg.SMTPUsername)
	}
	fromAddress, err := mail.ParseAddress(from)
	if err != nil {
		return fmt.Errorf("invalid SMTP sender address")
	}

	boundary := "cashchoices-" + generateRandomToken()
	message := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nList-Unsubscribe: <%s>\r\nList-Unsubscribe-Post: List-Unsubscribe=One-Click\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=%q\r\n\r\n"+
			"--%s\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n%s\r\n"+
			"--%s\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n%s\r\n"+
			"--%s--\r\n",
		fromAddress.String(), toAddress.String(), mime.QEncoding.Encode("UTF-8", subject), unsubscribeURL, boundary,
		boundary, wrapBase64(base64.StdEncoding.EncodeToString([]byte(textBody))),
		boundary, wrapBase64(base64.StdEncoding.EncodeToString([]byte(htmlBody))),
		boundary,
	)

	host := strings.TrimSpace(e.cfg.SMTPHost)
	port := strings.TrimSpace(e.cfg.SMTPPort)
	if port == "" {
		port = "587"
	}
	auth := smtp.PlainAuth("", e.cfg.SMTPUsername, e.cfg.SMTPPassword, host)
	addr := host + ":" + port
	if port == "465" {
		conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: host, MinVersion: tls.VersionTLS12})
		if err != nil {
			return fmt.Errorf("could not connect to SMTP server: %w", err)
		}
		client, err := smtp.NewClient(conn, host)
		if err != nil {
			_ = conn.Close()
			return fmt.Errorf("could not start SMTP session: %w", err)
		}
		defer client.Close()
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP authentication failed: %w", err)
		}
		if err := client.Mail(fromAddress.Address); err != nil {
			return fmt.Errorf("SMTP sender was rejected: %w", err)
		}
		if err := client.Rcpt(toAddress.Address); err != nil {
			return fmt.Errorf("SMTP recipient was rejected: %w", err)
		}
		writer, err := client.Data()
		if err != nil {
			return fmt.Errorf("SMTP message was rejected: %w", err)
		}
		if _, err := writer.Write([]byte(message)); err != nil {
			_ = writer.Close()
			return fmt.Errorf("could not send SMTP message: %w", err)
		}
		if err := writer.Close(); err != nil {
			return fmt.Errorf("SMTP server did not accept the message: %w", err)
		}
		return nil
	}

	if err := smtp.SendMail(addr, auth, fromAddress.Address, []string{toAddress.Address}, []byte(message)); err != nil {
		return fmt.Errorf("could not send newsletter via SMTP: %w", err)
	}
	return nil
}

func wrapBase64(encoded string) string {
	var wrapped strings.Builder
	for len(encoded) > 76 {
		wrapped.WriteString(encoded[:76])
		wrapped.WriteString("\r\n")
		encoded = encoded[76:]
	}
	wrapped.WriteString(encoded)
	return wrapped.String()
}
