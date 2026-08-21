# What an apply produced, for a human to read. The platform's
# `scripts/infra-apply.sh` prints this after applying, and that is its only
# consumer — no script, no workflow and nothing under `promote/` turns it into
# deployment input. The service is handed its bucket by a literal in the
# manifest Argo CD applies, and injecting the name at deploy time was rejected
# (decision 49). This output confirms the convention held; it does not feed it.

output "config_bucket" {
  description = "Bucket the service reads its greeting from."
  value       = module.dependencies.config_bucket
}
