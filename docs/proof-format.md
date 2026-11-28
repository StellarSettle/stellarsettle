# Invoice Hashes and Milestone Proof Format

StellarSettle has two separate hash fields. `invoice_hash` is a fixed-size
commitment to an invoice, while a milestone's `proof_hash` is a string
referencing proof content. They have different types and purposes; an IPFS CID
is not an invoice SHA-256 digest, and the two values are not interchangeable.

## Invoice hash

`attach_invoice_hash(caller, shipment_id, milestone_index, invoice_hash)`
accepts `invoice_hash` as `BytesN<32>` and stores it as an optional,
immutable value for that milestone. This is exactly 32 raw bytes. A common
choice is the SHA-256 digest of the exact invoice file bytes; when displayed as
hex, a 32-byte SHA-256 digest has 64 hexadecimal characters.

For example, the SHA-256 digest of the byte sequence `abc` is:

```text
ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
```

The hex above is a human-readable representation of 32 bytes, not a 64-byte
string to pass as `proof_hash`. Clients must encode the value as `BytesN<32>`.
The contract enforces the fixed byte length through the type, but does not
recompute the digest or verify that it is SHA-256. The supplier may attach it
only while the shipment is active and after submitting milestone proof; a
second attachment for the same milestone is rejected.

## Milestone proof schema

The contract entrypoint is:

```text
submit_proof(caller, shipment_id, milestone_index, proof_hash, proof_type)
```

- `proof_hash` is a Soroban `String`; it is stored as supplied.
- `proof_type` is a Soroban `Symbol` describing the reference format, commonly
  `ipfs` or `sha256`.
- The shipment must be active, the milestone index must exist, the milestone
  must still be `Pending`, and the caller must be an authorized proof submitter
  for that milestone (normally the supplier or logistics party).
- A buyer may set an allowed `proof_type` list for a milestone before its first
  submission. If a non-empty list is set, the submitted symbol must match one
  of its entries. With no list, the contract does not restrict the symbol.

### SHA-256 proof digest

To reference proof bytes directly by their SHA-256 digest, submit the digest as
64 hexadecimal characters with `proof_type` set to `sha256`. Calculate it from
the exact bytes the recipient is expected to verify. This is a digest string,
not an IPFS CID.

### IPFS CIDv1

To reference content stored on IPFS, submit its CID as `proof_hash` and use
`proof_type` `ipfs`. A CIDv1 may be represented in base32 lowercase, for
example:

```text
ipfs://bafkreif2pall7dybz7vecqka3zo24irdwabwdi4wc55jznaq75q7eaavvu
```

Here `bafkrei...` is the CIDv1; `ipfs://` is an optional URI prefix, not part of
the CID itself. The repository's `scripts/submit-proof.sh` uses this URI form
in its example and passes the supplied string through unchanged. Choose one
representation consistently with any configured required prefix. A CIDv1
identifies content using its CID version, codec, and multihash; it is not the
same representation as a 64-character SHA-256 digest, even when its multihash
uses SHA-256.

### Format examples and contract validation

| Intended use | `proof_type` | `proof_hash` or value | Format status |
| --- | --- | --- | --- |
| SHA-256 proof reference | `sha256` | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` | Valid 64-character hexadecimal digest encoding. |
| IPFS proof reference | `ipfs` | `ipfs://bafkreif2pall7dybz7vecqka3zo24irdwabwdi4wc55jznaq75q7eaavvu` | Example CIDv1 using the `ipfs://` URI form. |
| Invoice commitment | Not applicable | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` | Valid SHA-256 display encoding for the exact 32-byte `BytesN<32>` value. |
| Malformed CID example | `ipfs` | `ipfs://bafy-not-a-cid` | Not a valid CIDv1 encoding. |
| Malformed digest example | `sha256` | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015xz` | Not hexadecimal, so not a valid SHA-256 digest encoding. |
| Wrong invoice size | Not applicable | A value containing 31 bytes | Not a valid `BytesN<32>` value. |

The format labels above describe the recommended encodings, not a parser
implemented by the contract. `proof_hash` is opaque: by default the contract
does not check whether a string is a CID or a hexadecimal digest, and a
malformed example may still be submitted if no configured policy rejects it.
Likewise, a `proof_type` name does not cause the contract to calculate or
verify that hash. The fixed 32-byte invoice type is enforced separately.

## Proof hash length and optional policies

There is no single fixed application-level maximum for `proof_hash` in the
contract:

- `set_proof_hash_length_bounds(admin, min_len, max_len)` configures optional
  bounds. A value of `0` disables that side of the check. When `max_len` is
  non-zero, a proof hash longer than that configured length is rejected. The
  contract compares `proof_hash.len()`; for the ASCII encodings above, the
  measured length equals the character count.
- `set_proof_hash_required_prefix(admin, prefix)` can require an exact string
  prefix. When a non-empty prefix is configured, the current prefix-check
  implementation rejects proof hashes longer than **256 bytes**. This limit is
  conditional on prefix checking; it is not the default maximum.
- With both settings unset (their default), these checks impose no minimum,
  maximum, or format rule. Soroban transaction, host, and storage resource
  limits still apply, but the contract does not define a universal numeric
  maximum for them here.

The length bounds and prefix are also checked when correcting a submitted
proof. If a buyer configures either policy, submit a value that satisfies it;
for example, an `ipfs://` prefix must include the URI scheme when that is the
stored representation.

## Submitting proof at a milestone

Upload the proof artifact to IPFS and retain the CID, or compute a SHA-256
digest from the exact proof bytes. Before submission, confirm the buyer's
`proof_type` allowlist and any configured length or prefix policy. Then the
authorized supplier or logistics submitter signs a transaction for the
zero-based milestone index while it is `Pending`. The repository helper
defaults `proof_type` to `ipfs`; pass `sha256` explicitly for a digest:

```bash
# IPFS CIDv1
scripts/submit-proof.sh --id SHIP-001 --milestone 0 \
  --proof-hash "ipfs://bafkreif2pall7dybz7vecqka3zo24irdwabwdi4wc55jznaq75q7eaavvu" \
  --proof-type ipfs

# SHA-256 digest of the proof bytes
scripts/submit-proof.sh --id SHIP-001 --milestone 0 \
  --proof-hash "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" \
  --proof-type sha256
```

The script forwards both values to `submit_proof`; it does not parse the CID or
verify the digest. Once proof is on-chain, the supplier may separately attach
the optional invoice `BytesN<32>` commitment described above.
