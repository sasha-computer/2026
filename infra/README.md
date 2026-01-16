# Cloudflare Access (Terraform)

This directory creates a Cloudflare Access application and an email allowlist
policy to protect the deployed site.

## Prereqs

- Terraform >= 1.5
- Cloudflare API token with permissions for Access and Zero Trust

## Configure

Create `terraform.tfvars` in this directory:

```
cloudflare_api_token   = "..."
cloudflare_account_id  = "..."
app_name               = "boundless-explorer"
app_domain             = "explorer.example.com"
allowed_emails         = ["you@example.com"]
allowed_email_domains  = ["example.com"]
```

At least one of `allowed_emails` or `allowed_email_domains` must be non-empty.

## Apply

```
terraform init
terraform plan
terraform apply
```

