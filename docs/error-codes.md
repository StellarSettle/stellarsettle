# Contract Error Codes

This document is the complete reference for every error code defined in
`contracts/stellarsettle/src/errors.rs`. Each error is returned as a
`Result::Err(Error)` from the contract entry points listed below.

| Code | Name | Description | Raised by |
| ---- | ---- | ----------- | --------- |
| 1 | `AlreadyInitialized` | The contract has already been initialized and cannot be initialized again. | `initialize` |
| 2 | `NotInitialized` | The contract has not been initialized yet; call `initialize` first. | `create_stream`, `withdraw`, `cancel`, `get_stream` |
| 3 | `Unauthorized` | The caller is not authorized to perform this action (e.g. not the stream sender/recipient or admin). | `withdraw`, `cancel`, `set_admin` |
| 4 | `StreamNotFound` | No stream exists for the supplied stream ID. | `withdraw`, `cancel`, `get_stream` |
| 5 | `InvalidAmount` | The supplied amount is invalid (zero or negative). | `create_stream`, `withdraw` |
| 6 | `InvalidDuration` | The supplied duration is invalid (zero or end time not after start time). | `create_stream` |
| 7 | `StreamNotActive` | The stream is not active (already cancelled or fully withdrawn). | `withdraw`, `cancel` |
| 8 | `InsufficientBalance` | The stream does not hold enough withdrawable balance for the requested amount. | `withdraw` |
| 9 | `Overflow` | An arithmetic operation overflowed. | `create_stream`, `withdraw` |
| 10 | `InvalidRecipient` | The recipient address is invalid (e.g. equals the sender). | `create_stream` |

> Keep this table in sync with `contracts/stellarsettle/src/errors.rs`.
> When adding a new error variant, add a row here with its numeric code,
> name, description, and the function(s) that raise it.
