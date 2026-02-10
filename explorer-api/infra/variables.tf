variable "cloudflare_api_token" {
  type        = string
  sensitive   = true
  description = "Cloudflare API token with Access and Zone permissions."
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account ID that owns the Zero Trust configuration."
}

variable "app_name" {
  type        = string
  description = "Display name for the Access application."
  default     = "boundless-explorer"
}

variable "app_domain" {
  type        = string
  description = "Hostname protected by Access (for example, explorer.example.com)."
}

variable "allowed_emails" {
  type        = list(string)
  description = "Exact email addresses allowed to access the app."
  default     = []
}

variable "allowed_email_domains" {
  type        = list(string)
  description = "Email domains allowed to access the app (e.g. example.com)."
  default     = []
}

variable "session_duration" {
  type        = string
  description = "Session duration for Access authentication."
  default     = "24h"
}

