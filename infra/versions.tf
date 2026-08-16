terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Deliberately empty. Everything that distinguishes one environment's state
  # from another's lives in env/<environment>.backend.hcl and is supplied at
  # init time, so this file does not change to point somewhere else.
  backend "s3" {}
}

variable "s3_use_path_style" {
  description = <<-EOT
    Address buckets as a path rather than as a hostname. Off by default, which
    is what a real account wants; the local environment turns it on in its
    tfvars. This is the only knob in the whole configuration that exists
    because of where it is running, and it is a standard S3 addressing mode
    rather than something invented here.
  EOT
  type        = bool
  default     = false
}

# Region, credentials and endpoint all come from the standard AWS environment
# variables, so this configuration is the same one that would run against a
# real account. There is no endpoint override and no branch on environment.
provider "aws" {
  s3_use_path_style = var.s3_use_path_style
}
