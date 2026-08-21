# greeter

A small service that rides the paved road.

It exists to prove the road works: a change here flows through the shared pipeline, past the
gates, into the cluster, and gets verified once it is running. The service itself is
deliberately unremarkable — the interesting part is everything that happens to a commit.

The platform lives in [tarmac](https://github.com/KrisF-Midnight/tarmac). This repository
consumes it rather than copying it: the pipeline pinned to a version, the Terraform module
still by path until the platform is published.
