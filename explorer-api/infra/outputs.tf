output "access_application_id" {
  value       = cloudflare_access_application.app.id
  description = "ID of the Cloudflare Access application."
}

output "access_policy_id" {
  value       = cloudflare_access_policy.email_allow.id
  description = "ID of the email allowlist policy."
}

