# Read by the deployment stage, which turns them into the environment the pod
# starts with. The service discovers its bucket; it is never told one at build
# time.

output "config_bucket" {
  description = "Bucket the service reads its greeting from."
  value       = module.dependencies.config_bucket
}

output "config_bucket_parameter" {
  description = "SSM parameter naming that bucket."
  value       = module.dependencies.config_bucket_parameter
}
