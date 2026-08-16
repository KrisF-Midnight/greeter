# Where state lives for the local environment. Passed to `terraform init` with
# -backend-config, so adding an environment means adding a file here rather
# than editing the Terraform.

bucket = "tarmac-tfstate"
key    = "greeter/local.tfstate"
region = "eu-west-1"

# Locking via a lock object beside the state file. The DynamoDB lock table this
# replaces is deprecated as of Terraform 1.11, and it was always an odd ask — a
# second service, in a second region, to protect a file in the first.
use_lockfile = true

# The endpoint and the credentials are absent on purpose: those come from the
# standard AWS environment variables the platform exports, so nothing here
# names the local stand-in.
#
# Path style could not follow them. Terraform's S3 backend reads the SDK's
# endpoint variables but not AWS_S3_USE_PATH_STYLE, so it has to be stated.
# Without it the bucket name goes in the host header, `tarmac-tfstate.localhost`
# fails to resolve, and the error is a bare NoSuchBucket that says nothing
# about addressing. An environment backed by a real account omits this line.
use_path_style = true
