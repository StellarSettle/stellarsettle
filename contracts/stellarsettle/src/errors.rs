use soroban_sdk::contracterror;

/// Contract error codes raised by the StellarSettle contract.
///
/// Each variant maps to a stable numeric code returned in the
/// `InvokeHostFunction` result. See `docs/error-codes.md` for the full
/// reference table (code, name, description, raising function).
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Generic unclassified failure.
    /// Raised by: any entry point as a fallback.
    Unknown = 0,
    /// Caller is not authorized to perform the action.
    /// Raised by: admin-gated entry points (e.g. `set_admin`, `pause`).
    Unauthorized = 1,
    /// Contract has already been initialized.
    /// Raised by: `initialize`.
    AlreadyInitialized = 2,
    /// Contract has not been initialized yet.
    /// Raised by: entry points requiring stored config.
    NotInitialized = 3,
    /// An amount argument was zero or negative where a positive value is required.
    /// Raised by: deposit/withdraw/transfer entry points.
    InvalidAmount = 4,
    /// A supplied address argument was invalid or unexpected.
    /// Raised by: entry points validating address arguments.
    InvalidAddress = 5,
    /// Requested resource was not found.
    /// Raised by: lookup entry points (e.g. `get_*`).
    NotFound = 6,
    /// Operation is not permitted in the contract's current state.
    /// Raised by: state-dependent entry points (e.g. while paused).
    InvalidState = 7,
    /// An arithmetic operation overflowed or underflowed.
    /// Raised by: balance/amount arithmetic in transfer entry points.
    ArithmeticOverflow = 8,
    /// A deadline or timestamp argument has already passed.
    /// Raised by: entry points accepting expiry/deadline arguments.
    DeadlineExpired = 9,
    /// Insufficient balance to complete the operation.
    /// Raised by: withdraw/transfer entry points.
    InsufficientBalance = 10,
}
