# Everything this service needs that is not a Kubernetes object.
#
# It is short because the platform module carries the parts that are the same
# for every service. What is left is the part that is genuinely this service's
# decision: that it needs a greeting, and what that greeting says.

variable "environment" {
  description = "Which environment is being provisioned."
  type        = string
  default     = "local"
}

variable "greeting" {
  description = "What the service says. Read from S3 at request time, so changing it here and applying is enough — no rebuild, no redeploy."
  type        = string
  default     = "Hello from the paved road"
}

module "dependencies" {
  # A path rather than a version, for now. The platform is checked out beside
  # this repository — as a sibling on a laptop, and into a sibling directory in
  # CI — so the same relative path resolves in both. That is a convention
  # holding this together where a version constraint should be; it becomes
  # `git::…//infra/modules/app-dependencies?ref=v1` the moment the platform is
  # published, which is a one-line change. Recorded as an accepted cost in the
  # platform's decision record.
  source = "../../tarmac/infra/modules/app-dependencies"

  app_name    = "greeter"
  environment = var.environment

  config = {
    greeting = var.greeting
  }
}
