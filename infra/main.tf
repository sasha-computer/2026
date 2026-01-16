terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_access_application" "app" {
  account_id       = var.cloudflare_account_id
  name             = var.app_name
  domain           = var.app_domain
  type             = "self_hosted"
  session_duration = var.session_duration
}

resource "cloudflare_access_policy" "email_allow" {
  account_id     = var.cloudflare_account_id
  application_id = cloudflare_access_application.app.id
  name           = "Email allowlist"
  decision       = "allow"
  precedence     = 1

  include {
    email        = var.allowed_emails
    email_domain = var.allowed_email_domains
  }
}

