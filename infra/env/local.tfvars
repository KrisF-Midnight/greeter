# Inputs for the local environment. The environment that runs against a real
# account gets its own file beside this one and changes no Terraform.

environment = "local"

greeting = "Hello from the paved road"

# The same gap as in local.backend.hcl, on the provider side: the AWS provider
# honours the SDK's endpoint variables but not AWS_S3_USE_PATH_STYLE, so the
# one setting that cannot come from the environment is set here. Left at its
# default of false, the provider addresses buckets by hostname and every write
# retries against a name that does not resolve.
#
# Path style is a supported S3 addressing mode rather than a local-stack
# special case — the same flag is what talks to MinIO, or to S3 through an
# interface VPC endpoint.
s3_use_path_style = true
