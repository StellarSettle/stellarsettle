# Contract Event Reference

This reference enumerates every event published by `env.events().publish(...)` in `contracts/stellarsettle/src/lib.rs`. Topics are ordered Soroban `Symbol`/value entries; the first symbol normally names the event. The seven canonical lifecycle events use the two-symbol prefix `(Symbol("stellarsettle"), Symbol("<event>"))` and a map payload. Other events use positional payloads; their decoded samples below use JSON arrays for tuples, strings for symbols/addresses, and numbers for integer values. Samples illustrate shape and are not real account identifiers.

There are 235 unique event names across 249 emitted schemas. The source line is included to make changes easy to audit.

## `address_outflow_limit_set`

### Schema

- Topics: `( Symbol::new(&env, "address_outflow_limit_set"), address.clone(), )`
- Data shape: `(limit, window_ledgers)`
- Payload fields: `limit`, `window_ledgers`
- Emitting function(s): `set_address_outflow_limit` ([lib.rs:18460](../contracts/stellarsettle/src/lib.rs#L18460))
- Sample decoded payload: `{"topics":["address_outflow_limit_set","G...EXAMPLE"],"data":[1,1]}`

## `admin_action_executed`

### Schema

- Topics: `(Symbol::new(env, "admin_action_executed"), action_id.clone())`
- Data shape: `operation`
- Payload fields: `operation`
- Emitting function(s): `execute_admin_action` ([lib.rs:3172](../contracts/stellarsettle/src/lib.rs#L3172))
- Sample decoded payload: `{"topics":["admin_action_executed",1],"data":1}`

## `admin_action_proposed`

### Schema

- Topics: `( Symbol::new(&env, "admin_action_proposed"), action_id.clone(), )`
- Data shape: `approvals.len() as u32`
- Payload fields: `u32`
- Emitting function(s): `propose_admin_action` ([lib.rs:3146](../contracts/stellarsettle/src/lib.rs#L3146))
- Sample decoded payload: `{"topics":["admin_action_proposed",1],"data":1}`

## `admin_nominated`

### Schema

- Topics: `(Symbol::new(&env, "admin_nominated"),)`
- Data shape: `nominee`
- Payload fields: `nominee`
- Emitting function(s): `nominate_admin` ([lib.rs:12856](../contracts/stellarsettle/src/lib.rs#L12856))
- Sample decoded payload: `{"topics":["admin_nominated"],"data":"G...EXAMPLE"}`

## `admin_transferred`

### Schema

- Topics: `(Symbol::new(&env, "admin_transferred"),)`
- Data shape: `(old_admin, nominee)`
- Payload fields: `old_admin`, `nominee`
- Emitting function(s): `accept_admin` ([lib.rs:12878](../contracts/stellarsettle/src/lib.rs#L12878))
- Sample decoded payload: `{"topics":["admin_transferred"],"data":["G...EXAMPLE","G...EXAMPLE"]}`

## `advance_approved`

### Schema

- Topics: `(Symbol::new(&env, "advance_approved"), shipment_id.clone())`
- Data shape: `(milestone_index, advance_amount, shipment.supplier.clone())`
- Payload fields: `milestone_index`, `advance_amount`, `supplier`
- Emitting function(s): `approve_advance` ([lib.rs:8399](../contracts/stellarsettle/src/lib.rs#L8399))
- Sample decoded payload: `{"topics":["advance_approved","SHIP-2026-001"],"data":[1,1,"G...EXAMPLE"]}`

## `advance_requested`

### Schema

- Topics: `(Symbol::new(&env, "advance_requested"), shipment_id.clone())`
- Data shape: `(milestone_index, advance_percent, caller)`
- Payload fields: `milestone_index`, `advance_percent`, `caller`
- Emitting function(s): `request_advance` ([lib.rs:8303](../contracts/stellarsettle/src/lib.rs#L8303))
- Sample decoded payload: `{"topics":["advance_requested","SHIP-2026-001"],"data":[1,1,"G...EXAMPLE"]}`

## `allowed_token_added`

### Schema

- Topics: `(Symbol::new(&env, "allowed_token_added"),)`
- Data shape: `token`
- Payload fields: `token`
- Emitting function(s): `add_allowed_token` ([lib.rs:6375](../contracts/stellarsettle/src/lib.rs#L6375))
- Sample decoded payload: `{"topics":["allowed_token_added"],"data":"G...EXAMPLE"}`

## `allowed_token_removed`

### Schema

- Topics: `(Symbol::new(&env, "allowed_token_removed"),)`
- Data shape: `token`
- Payload fields: `token`
- Emitting function(s): `remove_allowed_token` ([lib.rs:6475](../contracts/stellarsettle/src/lib.rs#L6475))
- Sample decoded payload: `{"topics":["allowed_token_removed"],"data":"G...EXAMPLE"}`

## `amendment_proposed`

### Schema

- Topics: `(Symbol::new(&env, "amendment_proposed"), shipment_id.clone())`
- Data shape: `(milestone_index, new_percent)`
- Payload fields: `milestone_index`, `new_percent`
- Emitting function(s): `propose_amendment` ([lib.rs:12187](../contracts/stellarsettle/src/lib.rs#L12187))
- Sample decoded payload: `{"topics":["amendment_proposed","SHIP-2026-001"],"data":[1,1]}`

## `appeal_fee_forfeited`

### Schema

- Topics: `(Symbol::new(env, event), shipment_id.clone())`
- Data shape: `(milestone_index, recipient, amount)`
- Payload fields: `milestone_index`, `recipient`, `amount`
- Emitting function(s): `settle_appeal_fee` ([lib.rs:11730](../contracts/stellarsettle/src/lib.rs#L11730))
- Sample decoded payload: `{"topics":["appeal_fee_forfeited","SHIP-2026-001"],"data":[1,"G...EXAMPLE",1]}`

## `appeal_fee_refunded`

### Schema

- Topics: `(Symbol::new(env, event), shipment_id.clone())`
- Data shape: `(milestone_index, recipient, amount)`
- Payload fields: `milestone_index`, `recipient`, `amount`
- Emitting function(s): `settle_appeal_fee` ([lib.rs:11730](../contracts/stellarsettle/src/lib.rs#L11730))
- Sample decoded payload: `{"topics":["appeal_fee_refunded","SHIP-2026-001"],"data":[1,"G...EXAMPLE",1]}`

## `appeal_fee_set`

### Schema

- Topics: `(Symbol::new(&env, "appeal_fee_set"),)`
- Data shape: `amount`
- Payload fields: `amount`
- Emitting function(s): `set_appeal_fee` ([lib.rs:2839](../contracts/stellarsettle/src/lib.rs#L2839))
- Sample decoded payload: `{"topics":["appeal_fee_set"],"data":1}`

## `appeal_window_ledgers_set`

### Schema

- Topics: `(Symbol::new(&env, "appeal_window_ledgers_set"),)`
- Data shape: `ledgers`
- Payload fields: `ledgers`
- Emitting function(s): `set_appeal_window_ledgers` ([lib.rs:2818](../contracts/stellarsettle/src/lib.rs#L2818))
- Sample decoded payload: `{"topics":["appeal_window_ledgers_set"],"data":1}`

## `approved_buyer_added`

### Schema

- Topics: `(Symbol::new(&env, "approved_buyer_added"), supplier)`
- Data shape: `buyer`
- Payload fields: `buyer`
- Emitting function(s): `add_approved_buyer` ([lib.rs:5937](../contracts/stellarsettle/src/lib.rs#L5937))
- Sample decoded payload: `{"topics":["approved_buyer_added","G...EXAMPLE"],"data":"G...EXAMPLE"}`

## `approved_buyer_removed`

### Schema

- Topics: `(Symbol::new(&env, "approved_buyer_removed"), supplier)`
- Data shape: `buyer`
- Payload fields: `buyer`
- Emitting function(s): `remove_approved_buyer` ([lib.rs:5960](../contracts/stellarsettle/src/lib.rs#L5960))
- Sample decoded payload: `{"topics":["approved_buyer_removed","G...EXAMPLE"],"data":"G...EXAMPLE"}`

## `arbiter_availability_set`

### Schema

- Topics: `(Symbol::new(&env, "arbiter_availability_set"), arbiter)`
- Data shape: `available`
- Payload fields: `available`
- Emitting function(s): `set_arbiter_availability` ([lib.rs:6592](../contracts/stellarsettle/src/lib.rs#L6592))
- Sample decoded payload: `{"topics":["arbiter_availability_set","G...EXAMPLE"],"data":true}`

## `arbiter_failover`

### Schema

- Topics: `(Symbol::new(&env, "arbiter_failover"), shipment_id)`
- Data shape: `(old_arbiter, backup)`
- Payload fields: `old_arbiter`, `backup`
- Emitting function(s): `activate_backup_arbiter` ([lib.rs:14719](../contracts/stellarsettle/src/lib.rs#L14719))
- Sample decoded payload: `{"topics":["arbiter_failover","SHIP-2026-001"],"data":["G...EXAMPLE",1]}`

## `arbiter_fee_allocated`

### Schema

- Topics: `(Symbol::new(env, "arbiter_fee_allocated"), shipment_id.clone())`
- Data shape: `(milestone_index, arbiter_fee, cover, arbiter_fee - cover)`
- Payload fields: `milestone_index`, `arbiter_fee`, `cover`, `cover`
- Emitting function(s): `loser_pays_cover` ([lib.rs:20294](../contracts/stellarsettle/src/lib.rs#L20294))
- Sample decoded payload: `{"topics":["arbiter_fee_allocated","SHIP-2026-001"],"data":[1,"G...EXAMPLE",1,1]}`

## `arbiter_inactivity_threshold_set`

### Schema

- Topics: `(Symbol::new(&env, "arbiter_inactivity_threshold_set"),)`
- Data shape: `threshold_ledgers`
- Payload fields: `threshold_ledgers`
- Emitting function(s): `set_arbiter_inactivity_threshold` ([lib.rs:14757](../contracts/stellarsettle/src/lib.rs#L14757))
- Sample decoded payload: `{"topics":["arbiter_inactivity_threshold_set"],"data":1}`

## `arbiter_pool_updated`

### Schema 1

- Topics: `(Symbol::new(&env, "arbiter_pool_updated"),)`
- Data shape: `(Symbol::new(&env, "added"), arbiter)`
- Payload fields: `value_1`, `arbiter`
- Emitting function(s): `add_arbiter_to_pool` ([lib.rs:6524](../contracts/stellarsettle/src/lib.rs#L6524))
- Sample decoded payload: `{"topics":["arbiter_pool_updated"],"data":[1,"G...EXAMPLE"]}`

### Schema 2

- Topics: `(Symbol::new(&env, "arbiter_pool_updated"),)`
- Data shape: `(Symbol::new(&env, "removed"), arbiter)`
- Payload fields: `value_1`, `arbiter`
- Emitting function(s): `remove_arbiter_from_pool` ([lib.rs:6556](../contracts/stellarsettle/src/lib.rs#L6556))
- Sample decoded payload: `{"topics":["arbiter_pool_updated"],"data":[1,"G...EXAMPLE"]}`

## `arbiter_recused`

### Schema

- Topics: `(Symbol::new(&env, "arbiter_recused"), shipment_id.clone())`
- Data shape: `(arbiter, new_arbiter)`
- Payload fields: `arbiter`, `new_arbiter`
- Emitting function(s): `recuse_arbiter` ([lib.rs:12498](../contracts/stellarsettle/src/lib.rs#L12498))
- Sample decoded payload: `{"topics":["arbiter_recused","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE"]}`

## `arbiter_reinstated`

### Schema

- Topics: `(Symbol::new(&env, "arbiter_reinstated"),)`
- Data shape: `arbiter`
- Payload fields: `arbiter`
- Emitting function(s): `reinstate_arbiter` ([lib.rs:6857](../contracts/stellarsettle/src/lib.rs#L6857))
- Sample decoded payload: `{"topics":["arbiter_reinstated"],"data":"G...EXAMPLE"}`

## `arbiter_repetition_size_set`

### Schema

- Topics: `(Symbol::new(&env, "arbiter_repetition_size_set"),)`
- Data shape: `size`
- Payload fields: `size`
- Emitting function(s): `set_arbiter_history_size` ([lib.rs:6619](../contracts/stellarsettle/src/lib.rs#L6619))
- Sample decoded payload: `{"topics":["arbiter_repetition_size_set"],"data":1}`

## `arbiter_rotated`

### Schema

- Topics: `(Symbol::new(&env, "arbiter_rotated"), shipment_id.clone())`
- Data shape: `new_arbiter`
- Payload fields: `new_arbiter`
- Emitting function(s): `propose_arbiter_rotation` ([lib.rs:12584](../contracts/stellarsettle/src/lib.rs#L12584))
- Sample decoded payload: `{"topics":["arbiter_rotated","SHIP-2026-001"],"data":"G...EXAMPLE"}`

## `arbiter_rotation_proposed`

### Schema

- Topics: `( Symbol::new(&env, "arbiter_rotation_proposed"), shipment_id.clone(), )`
- Data shape: `new_arbiter.clone()`
- Payload fields: `new_arbiter`
- Emitting function(s): `propose_arbiter_rotation` ([lib.rs:12556](../contracts/stellarsettle/src/lib.rs#L12556))
- Sample decoded payload: `{"topics":["arbiter_rotation_proposed","SHIP-2026-001"],"data":"G...EXAMPLE"}`

## `arbiter_slash_bps_set`

### Schema

- Topics: `(Symbol::new(&env, "arbiter_slash_bps_set"),)`
- Data shape: `bps`
- Payload fields: `bps`
- Emitting function(s): `set_arbiter_slash_bps` ([lib.rs:14944](../contracts/stellarsettle/src/lib.rs#L14944))
- Sample decoded payload: `{"topics":["arbiter_slash_bps_set"],"data":1}`

## `arbiter_slashed`

### Schema

- Topics: `(Symbol::new(env, "arbiter_slashed"),)`
- Data shape: `(arbiter.clone(), overturned_count)`
- Payload fields: `arbiter`, `overturned_count`
- Emitting function(s): `slash_arbiter` ([lib.rs:6885](../contracts/stellarsettle/src/lib.rs#L6885))
- Sample decoded payload: `{"topics":["arbiter_slashed"],"data":["G...EXAMPLE",1]}`

## `arbiter_stake_deposited`

### Schema

- Topics: `(Symbol::new(&env, "arbiter_stake_deposited"), arbiter)`
- Data shape: `(token, amount, new_amt)`
- Payload fields: `token`, `amount`, `new_amt`
- Emitting function(s): `deposit_arbiter_stake` ([lib.rs:14982](../contracts/stellarsettle/src/lib.rs#L14982))
- Sample decoded payload: `{"topics":["arbiter_stake_deposited","G...EXAMPLE"],"data":["G...EXAMPLE",1,1]}`

## `arbiter_stake_slashed`

### Schema

- Topics: `(Symbol::new(env, "arbiter_stake_slashed"), original_arbiter.clone())`
- Data shape: `(wronged_party.clone(), slash_amt, remaining, slash_bps)`
- Payload fields: `wronged_party`, `slash_amt`, `remaining`, `slash_bps`
- Emitting function(s): `maybe_slash_arbiter_stake` ([lib.rs:19315](../contracts/stellarsettle/src/lib.rs#L19315))
- Sample decoded payload: `{"topics":["arbiter_stake_slashed","G...EXAMPLE"],"data":[1,1,1,1]}`

## `archive_threshold_set`

### Schema

- Topics: `(Symbol::new(&env, "archive_threshold_set"),)`
- Data shape: `ledgers`
- Payload fields: `ledgers`
- Emitting function(s): `set_archive_threshold` ([lib.rs:16661](../contracts/stellarsettle/src/lib.rs#L16661))
- Sample decoded payload: `{"topics":["archive_threshold_set"],"data":1}`

## `assigned_payout`

### Schema

- Topics: `(Symbol::new(env, "assigned_payout"), shipment_id.clone())`
- Data shape: `(milestone_index, financier, net_amount)`
- Payload fields: `milestone_index`, `financier`, `net_amount`
- Emitting function(s): `pay_milestone_to_payees` ([lib.rs:18138](../contracts/stellarsettle/src/lib.rs#L18138))
- Sample decoded payload: `{"topics":["assigned_payout","SHIP-2026-001"],"data":[1,"G...EXAMPLE",1]}`

## `auto_blacklist_rule_set`

### Schema

- Topics: `(Symbol::new(&env, "auto_blacklist_rule_set"),)`
- Data shape: `(max_cancelled, max_disputed)`
- Payload fields: `max_cancelled`, `max_disputed`
- Emitting function(s): `set_auto_blacklist_rule` ([lib.rs:16085](../contracts/stellarsettle/src/lib.rs#L16085))
- Sample decoded payload: `{"topics":["auto_blacklist_rule_set"],"data":[1,1]}`

## `auto_confirm_threshold_set`

### Schema

- Topics: `(Symbol::new(&env, "auto_confirm_threshold_set"),)`
- Data shape: `window_ledgers`
- Payload fields: `window_ledgers`
- Emitting function(s): `set_auto_confirm_threshold` ([lib.rs:14738](../contracts/stellarsettle/src/lib.rs#L14738))
- Sample decoded payload: `{"topics":["auto_confirm_threshold_set"],"data":1}`

## `auto_confirmation_claimed`

### Schema

- Topics: `( Symbol::new(&env, "auto_confirmation_claimed"), shipment_id.clone(), )`
- Data shape: `(milestone_index, payment, fee_amount, penalty_deducted)`
- Payload fields: `milestone_index`, `payment`, `fee_amount`, `penalty_deducted`
- Emitting function(s): `claim_auto_confirmation` ([lib.rs:12833](../contracts/stellarsettle/src/lib.rs#L12833))
- Sample decoded payload: `{"topics":["auto_confirmation_claimed","SHIP-2026-001"],"data":[1,1,1,1]}`

## `batch_cancel_reason`

### Schema

- Topics: `(Symbol::new(env, "batch_cancel_reason"), shipment_id.clone())`
- Data shape: `r`
- Payload fields: `r`
- Emitting function(s): `cancel_shipment_internal` ([lib.rs:11963](../contracts/stellarsettle/src/lib.rs#L11963))
- Sample decoded payload: `{"topics":["batch_cancel_reason","SHIP-2026-001"],"data":1}`

## `blacklist_appeal_filed`

### Schema

- Topics: `(Symbol::new(&env, "blacklist_appeal_filed"), address)`
- Data shape: `appeal.filed_ledger`
- Payload fields: `filed_ledger`
- Emitting function(s): `appeal_blacklist` ([lib.rs:5790](../contracts/stellarsettle/src/lib.rs#L5790))
- Sample decoded payload: `{"topics":["blacklist_appeal_filed","G...EXAMPLE"],"data":1}`

## `blacklist_appeal_reviewed`

### Schema

- Topics: `(Symbol::new(&env, "blacklist_appeal_reviewed"), address)`
- Data shape: `approve`
- Payload fields: `approve`
- Emitting function(s): `review_blacklist_appeal` ([lib.rs:5837](../contracts/stellarsettle/src/lib.rs#L5837))
- Sample decoded payload: `{"topics":["blacklist_appeal_reviewed","G...EXAMPLE"],"data":true}`

## `buyer_allowed_tokens_set`

### Schema

- Topics: `(Symbol::new(&env, "buyer_allowed_tokens_set"), buyer)`
- Data shape: `tokens`
- Payload fields: `tokens`
- Emitting function(s): `set_buyer_allowed_tokens` ([lib.rs:6433](../contracts/stellarsettle/src/lib.rs#L6433))
- Sample decoded payload: `{"topics":["buyer_allowed_tokens_set","G...EXAMPLE"],"data":"G...EXAMPLE"}`

## `buyer_dispute_cap_cleared`

### Schema

- Topics: `(Symbol::new(&env, "buyer_dispute_cap_cleared"), buyer)`
- Data shape: `()`
- Payload fields: unit
- Emitting function(s): `clear_buyer_dispute_cap` ([lib.rs:3851](../contracts/stellarsettle/src/lib.rs#L3851))
- Sample decoded payload: `{"topics":["buyer_dispute_cap_cleared","G...EXAMPLE"],"data":null}`

## `buyer_dispute_cap_set`

### Schema

- Topics: `(Symbol::new(&env, "buyer_dispute_cap_set"), buyer)`
- Data shape: `limit`
- Payload fields: `limit`
- Emitting function(s): `set_buyer_dispute_cap` ([lib.rs:3834](../contracts/stellarsettle/src/lib.rs#L3834))
- Sample decoded payload: `{"topics":["buyer_dispute_cap_set","G...EXAMPLE"],"data":1}`

## `buyer_spending_limit_set`

### Schema

- Topics: `(Symbol::new(&env, "buyer_spending_limit_set"), buyer)`
- Data shape: `(limit, window_ledgers)`
- Payload fields: `limit`, `window_ledgers`
- Emitting function(s): `set_buyer_spending_limit` ([lib.rs:7856](../contracts/stellarsettle/src/lib.rs#L7856))
- Sample decoded payload: `{"topics":["buyer_spending_limit_set","G...EXAMPLE"],"data":[1,1]}`

## `buyer_transferred`

### Schema

- Topics: `(Symbol::new(&env, "buyer_transferred"), shipment_id.clone())`
- Data shape: `(current_buyer, new_buyer)`
- Payload fields: `current_buyer`, `new_buyer`
- Emitting function(s): `transfer_buyer` ([lib.rs:12316](../contracts/stellarsettle/src/lib.rs#L12316))
- Sample decoded payload: `{"topics":["buyer_transferred","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE"]}`

## `circuit_breaker_set`

### Schema

- Topics: `(Symbol::new(&env, "circuit_breaker_set"),)`
- Data shape: `(limit, window_ledgers)`
- Payload fields: `limit`, `window_ledgers`
- Emitting function(s): `set_circuit_breaker` ([lib.rs:3067](../contracts/stellarsettle/src/lib.rs#L3067))
- Sample decoded payload: `{"topics":["circuit_breaker_set"],"data":[1,1]}`

## `clean_completion_rebate`

### Schema

- Topics: `(Symbol::new(env, "clean_completion_rebate"), shipment_id.clone())`
- Data shape: `(shipment.supplier.clone(), rebate, fees_paid, bps)`
- Payload fields: `supplier`, `rebate`, `fees_paid`, `bps`
- Emitting function(s): `maybe_pay_clean_completion_rebate` ([lib.rs:19260](../contracts/stellarsettle/src/lib.rs#L19260))
- Sample decoded payload: `{"topics":["clean_completion_rebate","SHIP-2026-001"],"data":["G...EXAMPLE",1,1,1]}`

## `clean_completion_rebate_bps_set`

### Schema

- Topics: `(Symbol::new(&env, "clean_completion_rebate_bps_set"),)`
- Data shape: `bps`
- Payload fields: `bps`
- Emitting function(s): `set_clean_completion_rebate_bps` ([lib.rs:14909](../contracts/stellarsettle/src/lib.rs#L14909))
- Sample decoded payload: `{"topics":["clean_completion_rebate_bps_set"],"data":1}`

## `co_buyer_set`

### Schema

- Topics: `(Symbol::new(&env, "co_buyer_set"), shipment_id)`
- Data shape: `co_buyer`
- Payload fields: `co_buyer`
- Emitting function(s): `set_co_buyer` ([lib.rs:8505](../contracts/stellarsettle/src/lib.rs#L8505))
- Sample decoded payload: `{"topics":["co_buyer_set","SHIP-2026-001"],"data":"G...EXAMPLE"}`

## `collateral_partial_release`

### Schema

- Topics: `( Symbol::new(env, "collateral_partial_release"), shipment_id.clone(), )`
- Data shape: `(milestone_index, share, remaining - share)`
- Payload fields: `milestone_index`, `share`, `share`
- Emitting function(s): `release_milestone_collateral_share` ([lib.rs:4274](../contracts/stellarsettle/src/lib.rs#L4274))
- Sample decoded payload: `{"topics":["collateral_partial_release","SHIP-2026-001"],"data":[1,1,1]}`

## `collateral_slashed`

### Schema

- Topics: `(Symbol::new(&env, "collateral_slashed"), shipment_id.clone())`
- Data shape: `( milestone_index, slash, remaining - slash, shipment.buyers.get(0).unwrap(), caller, )`
- Payload fields: `milestone_index`, `slash`, `slash`, `value_4`, `caller`
- Emitting function(s): `slash_collateral_for_miss` ([lib.rs:4430](../contracts/stellarsettle/src/lib.rs#L4430))
- Sample decoded payload: `{"topics":["collateral_slashed","SHIP-2026-001"],"data":[1,1,1,1,"G...EXAMPLE"]}`

## `collateral_token_set`

### Schema

- Topics: `(Symbol::new(&env, "collateral_token_set"), shipment_id)`
- Data shape: `collateral_token`
- Payload fields: `collateral_token`
- Emitting function(s): `set_collateral_token` ([lib.rs:15159](../contracts/stellarsettle/src/lib.rs#L15159))
- Sample decoded payload: `{"topics":["collateral_token_set","SHIP-2026-001"],"data":"G...EXAMPLE"}`

## `collateral_topped_up`

### Schema

- Topics: `(Symbol::new(&env, "collateral_topped_up"), shipment_id)`
- Data shape: `(supplier, amount, new_balance)`
- Payload fields: `supplier`, `amount`, `new_balance`
- Emitting function(s): `top_up_collateral` ([lib.rs:4054](../contracts/stellarsettle/src/lib.rs#L4054))
- Sample decoded payload: `{"topics":["collateral_topped_up","SHIP-2026-001"],"data":["G...EXAMPLE",1,1]}`

## `compliance_hold_cleared`

### Schema

- Topics: `(Symbol::new(&env, "compliance_hold_cleared"), shipment_id)`
- Data shape: `()`
- Payload fields: unit
- Emitting function(s): `clear_compliance_hold` ([lib.rs:16497](../contracts/stellarsettle/src/lib.rs#L16497))
- Sample decoded payload: `{"topics":["compliance_hold_cleared","SHIP-2026-001"],"data":null}`

## `compliance_hold_set`

### Schema

- Topics: `(Symbol::new(&env, "compliance_hold_set"), shipment_id)`
- Data shape: `reason_hash`
- Payload fields: `reason_hash`
- Emitting function(s): `set_compliance_hold` ([lib.rs:16482](../contracts/stellarsettle/src/lib.rs#L16482))
- Sample decoded payload: `{"topics":["compliance_hold_set","SHIP-2026-001"],"data":"abc123"}`

## `condition_breach_reported`

### Schema

- Topics: `( Symbol::new(&env, "condition_breach_reported"), shipment_id.clone(), )`
- Data shape: `(milestone_index, data_hash, oracle, reports.len())`
- Payload fields: `milestone_index`, `data_hash`, `oracle`, `value_4`
- Emitting function(s): `report_condition_breach` ([lib.rs:14314](../contracts/stellarsettle/src/lib.rs#L14314))
- Sample decoded payload: `{"topics":["condition_breach_reported","SHIP-2026-001"],"data":[1,"abc123","G...EXAMPLE",1]}`

## `confirmation_cooldown_set`

### Schema

- Topics: `(Symbol::new(&env, "confirmation_cooldown_set"),)`
- Data shape: `ledgers`
- Payload fields: `ledgers`
- Emitting function(s): `set_confirmation_cooldown` ([lib.rs:14770](../contracts/stellarsettle/src/lib.rs#L14770))
- Sample decoded payload: `{"topics":["confirmation_cooldown_set"],"data":1}`

## `contract_paused`

### Schema

- Topics: `(Symbol::new(&env, "contract_paused"),)`
- Data shape: `env.ledger().sequence()`
- Payload fields: `ledger_sequence`
- Emitting function(s): `pause` ([lib.rs:2180](../contracts/stellarsettle/src/lib.rs#L2180))
- Sample decoded payload: `{"topics":["contract_paused"],"data":1}`

## `contract_unpaused`

### Schema

- Topics: `(Symbol::new(&env, "contract_unpaused"),)`
- Data shape: `env.ledger().sequence()`
- Payload fields: `ledger_sequence`
- Emitting function(s): `unpause` ([lib.rs:2196](../contracts/stellarsettle/src/lib.rs#L2196))
- Sample decoded payload: `{"topics":["contract_unpaused"],"data":1}`

## `contract_upgraded`

### Schema

- Topics: `(Symbol::new(&env, "contract_upgraded"),)`
- Data shape: `(new_wasm_hash, env.ledger().sequence())`
- Payload fields: `new_wasm_hash`, `ledger_sequence`
- Emitting function(s): `upgrade` ([lib.rs:1941](../contracts/stellarsettle/src/lib.rs#L1941))
- Sample decoded payload: `{"topics":["contract_upgraded"],"data":["abc123",1]}`

## `conversion_rate_cleared`

### Schema

- Topics: `( Symbol::new(&env, "conversion_rate_cleared"), from_token, to_token, )`
- Data shape: `()`
- Payload fields: unit
- Emitting function(s): `clear_conversion_rate` ([lib.rs:18409](../contracts/stellarsettle/src/lib.rs#L18409))
- Sample decoded payload: `{"topics":["conversion_rate_cleared","G...EXAMPLE","G...EXAMPLE"],"data":null}`

## `conversion_rate_set`

### Schema

- Topics: `(Symbol::new(&env, "conversion_rate_set"), from_token, to_token)`
- Data shape: `rate_bps`
- Payload fields: `rate_bps`
- Emitting function(s): `set_conversion_rate` ([lib.rs:18396](../contracts/stellarsettle/src/lib.rs#L18396))
- Sample decoded payload: `{"topics":["conversion_rate_set","G...EXAMPLE","G...EXAMPLE"],"data":1}`

## `counterparty_rated`

### Schema

- Topics: `(Symbol::new(&env, "counterparty_rated"), shipment_id)`
- Data shape: `(caller, rated_address, stars, comment_hash)`
- Payload fields: `caller`, `rated_address`, `stars`, `comment_hash`
- Emitting function(s): `rate_counterparty` ([lib.rs:17029](../contracts/stellarsettle/src/lib.rs#L17029))
- Sample decoded payload: `{"topics":["counterparty_rated","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE",1,"abc123"]}`

## `deadline_approaching`

### Schema

- Topics: `( Symbol::new(&env, "deadline_approaching"), shipment_id.clone(), )`
- Data shape: `( milestone_index, ledgers_remaining, milestone.deadline_ledger, )`
- Payload fields: `milestone_index`, `ledgers_remaining`, `deadline_ledger`
- Emitting function(s): `check_deadline_warning` ([lib.rs:11826](../contracts/stellarsettle/src/lib.rs#L11826))
- Sample decoded payload: `{"topics":["deadline_approaching","SHIP-2026-001"],"data":[1,1,1]}`

## `delegate_authorized`

### Schema

- Topics: `( Symbol::new(&env, "delegate_authorized"), shipment_id.clone(), )`
- Data shape: `(buyer, delegate, per_tx_cap)`
- Payload fields: `buyer`, `delegate`, `per_tx_cap`
- Emitting function(s): `authorize_delegate` ([lib.rs:5566](../contracts/stellarsettle/src/lib.rs#L5566))
- Sample decoded payload: `{"topics":["delegate_authorized","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE",1]}`

## `delegate_revoked`

### Schema

- Topics: `(Symbol::new(&env, "delegate_revoked"), shipment_id.clone())`
- Data shape: `(buyer, env.ledger().sequence())`
- Payload fields: `buyer`, `ledger_sequence`
- Emitting function(s): `revoke_delegate` ([lib.rs:5586](../contracts/stellarsettle/src/lib.rs#L5586))
- Sample decoded payload: `{"topics":["delegate_revoked","SHIP-2026-001"],"data":["G...EXAMPLE",1]}`

## `depeg_guard_removed`

### Schema

- Topics: `(Symbol::new(&env, "depeg_guard_removed"), token)`
- Data shape: `()`
- Payload fields: unit
- Emitting function(s): `remove_depeg_guard` ([lib.rs:15218](../contracts/stellarsettle/src/lib.rs#L15218))
- Sample decoded payload: `{"topics":["depeg_guard_removed","G...EXAMPLE"],"data":null}`

## `depeg_guard_set`

### Schema

- Topics: `(Symbol::new(&env, "depeg_guard_set"), token)`
- Data shape: `(min_price, max_price)`
- Payload fields: `min_price`, `max_price`
- Emitting function(s): `set_depeg_guard` ([lib.rs:15204](../contracts/stellarsettle/src/lib.rs#L15204))
- Sample decoded payload: `{"topics":["depeg_guard_set","G...EXAMPLE"],"data":[1,1]}`

## `dispute_appealed`

### Schema

- Topics: `(Symbol::new(&env, "dispute_appealed"), shipment_id)`
- Data shape: `(milestone_index, caller, new_arbiter)`
- Payload fields: `milestone_index`, `caller`, `new_arbiter`
- Emitting function(s): `appeal_dispute` ([lib.rs:11680](../contracts/stellarsettle/src/lib.rs#L11680))
- Sample decoded payload: `{"topics":["dispute_appealed","SHIP-2026-001"],"data":[1,"G...EXAMPLE","G...EXAMPLE"]}`

## `dispute_auto_resolved`

### Schema

- Topics: `( Symbol::new(&env, "dispute_auto_resolved"), shipment_id.clone(), )`
- Data shape: `(milestone_index, resolution_sym.clone())`
- Payload fields: `milestone_index`, `resolution_sym`
- Emitting function(s): `resolve_dispute_timeout` ([lib.rs:13250](../contracts/stellarsettle/src/lib.rs#L13250))
- Sample decoded payload: `{"topics":["dispute_auto_resolved","SHIP-2026-001"],"data":[1,"resolution_sym"]}`

## `dispute_escalated`

### Schema

- Topics: `(Symbol::new(&env, "dispute_escalated"), shipment_id.clone())`
- Data shape: `(milestone_index, opened_ledger, current_ledger)`
- Payload fields: `milestone_index`, `opened_ledger`, `current_ledger`
- Emitting function(s): `check_escalation` ([lib.rs:11766](../contracts/stellarsettle/src/lib.rs#L11766))
- Sample decoded payload: `{"topics":["dispute_escalated","SHIP-2026-001"],"data":[1,1,1]}`

## `dispute_evidence_submitted`

### Schema

- Topics: `( Symbol::new(&env, "dispute_evidence_submitted"), shipment_id.clone(), )`
- Data shape: `(milestone_index, caller, evidence_hash, evidence_type)`
- Payload fields: `milestone_index`, `caller`, `evidence_hash`, `evidence_type`
- Emitting function(s): `submit_dispute_evidence` ([lib.rs:18550](../contracts/stellarsettle/src/lib.rs#L18550))
- Sample decoded payload: `{"topics":["dispute_evidence_submitted","SHIP-2026-001"],"data":[1,"G...EXAMPLE","abc123","evidence_type"]}`

## `dispute_filing_window_set`

### Schema

- Topics: `(Symbol::new(&env, "dispute_filing_window_set"),)`
- Data shape: `ledgers`
- Payload fields: `ledgers`
- Emitting function(s): `set_dispute_filing_window` ([lib.rs:2765](../contracts/stellarsettle/src/lib.rs#L2765))
- Sample decoded payload: `{"topics":["dispute_filing_window_set"],"data":1}`

## `dispute_opened`

### Schema

- Topics: `( Symbol::new(env, "stellarsettle"), Symbol::new(env, "dispute_opened"), )`
- Data shape: `data`
- Payload fields: `data`
- Emitting function(s): `emit_dispute_opened`, `open_condition_breach_dispute`, `raise_dispute`, `raise_partial_dispute` ([lib.rs:19728](../contracts/stellarsettle/src/lib.rs#L19728))
- Sample decoded payload: `{"topics":["stellarsettle","dispute_opened"],"data":{"shipment_id":"SHIP-2026-001","milestone_index":1,"buyer":"G...EXAMPLE"}}`

## `dispute_panel_assigned`

### Schema

- Topics: `(Symbol::new(&env, "dispute_panel_assigned"), shipment_id)`
- Data shape: `(milestone_index, panel.clone())`
- Payload fields: `milestone_index`, `panel`
- Emitting function(s): `assign_dispute_panel` ([lib.rs:6712](../contracts/stellarsettle/src/lib.rs#L6712))
- Sample decoded payload: `{"topics":["dispute_panel_assigned","SHIP-2026-001"],"data":[1,1]}`

## `dispute_raised`

### Schema 1

- Topics: `(Symbol::new(&env, "dispute_raised"), shipment_id.clone())`
- Data shape: `milestone_index`
- Payload fields: `milestone_index`
- Emitting function(s): `raise_dispute` ([lib.rs:10563](../contracts/stellarsettle/src/lib.rs#L10563))
- Sample decoded payload: `{"topics":["dispute_raised","SHIP-2026-001"],"data":1}`

### Schema 2

- Topics: `(Symbol::new(env, "dispute_raised"), shipment_id.clone())`
- Data shape: `milestone_index`
- Payload fields: `milestone_index`
- Emitting function(s): `open_condition_breach_dispute` ([lib.rs:21181](../contracts/stellarsettle/src/lib.rs#L21181))
- Sample decoded payload: `{"topics":["dispute_raised","SHIP-2026-001"],"data":1}`

## `dispute_resolution_finalized`

### Schema

- Topics: `( Symbol::new(&env, "dispute_resolution_finalized"), shipment_id.clone(), )`
- Data shape: `(milestone_index, payment, fee_amount)`
- Payload fields: `milestone_index`, `payment`, `fee_amount`
- Emitting function(s): `finalize_dispute_resolution` ([lib.rs:11537](../contracts/stellarsettle/src/lib.rs#L11537))
- Sample decoded payload: `{"topics":["dispute_resolution_finalized","SHIP-2026-001"],"data":[1,1,1]}`

## `dispute_resolved`

### Schema 1

- Topics: `(Symbol::new(&env, "dispute_resolved"), shipment_id.clone())`
- Data shape: `( milestone_index, approve, is_partial, released_amount, remaining_amount, reason, )`
- Payload fields: `milestone_index`, `approve`, `is_partial`, `released_amount`, `remaining_amount`, `reason`
- Emitting function(s): `resolve_dispute` ([lib.rs:11325](../contracts/stellarsettle/src/lib.rs#L11325))
- Sample decoded payload: `{"topics":["dispute_resolved","SHIP-2026-001"],"data":[1,true,true,1,1,"reason"]}`

### Schema 2

- Topics: `(Symbol::new(env, "dispute_resolved"), shipment_id.clone())`
- Data shape: `( milestone_index, approve, is_partial, released_amount, remaining_amount, )`
- Payload fields: `milestone_index`, `approve`, `is_partial`, `released_amount`, `remaining_amount`
- Emitting function(s): `resolve_dispute_panel_internal` ([lib.rs:15866](../contracts/stellarsettle/src/lib.rs#L15866))
- Sample decoded payload: `{"topics":["dispute_resolved","SHIP-2026-001"],"data":[1,true,true,1,1]}`

### Schema 3

- Topics: `( Symbol::new(env, "stellarsettle"), Symbol::new(env, "dispute_resolved"), )`
- Data shape: `data`
- Payload fields: `data`
- Emitting function(s): `emit_dispute_resolved`, `apply_mediation_outcome`, `finalize_dispute_resolution`, `resolve_dispute`, `resolve_dispute_panel_internal`, `resolve_dispute_timeout` ([lib.rs:19759](../contracts/stellarsettle/src/lib.rs#L19759))
- Sample decoded payload: `{"topics":["stellarsettle","dispute_resolved"],"data":{"shipment_id":"SHIP-2026-001","milestone_index":1,"resolution":"resolution","resolver":"G...EXAMPLE","reason":"reason"}}`

## `dispute_timeout_handoff`

### Schema

- Topics: `( Symbol::new(&env, "dispute_timeout_handoff"), shipment_id.clone(), )`
- Data shape: `(milestone_index, old_arbiter, backup)`
- Payload fields: `milestone_index`, `old_arbiter`, `backup`
- Emitting function(s): `resolve_dispute_timeout` ([lib.rs:13059](../contracts/stellarsettle/src/lib.rs#L13059))
- Sample decoded payload: `{"topics":["dispute_timeout_handoff","SHIP-2026-001"],"data":[1,"G...EXAMPLE",1]}`

## `dispute_vote_cast`

### Schema

- Topics: `(Symbol::new(&env, "dispute_vote_cast"), shipment_id.clone())`
- Data shape: `( milestone_index, arbiter.clone(), approve, votes.len() as u32, )`
- Payload fields: `milestone_index`, `arbiter`, `approve`, `u32`
- Emitting function(s): `cast_dispute_vote` ([lib.rs:15564](../contracts/stellarsettle/src/lib.rs#L15564))
- Sample decoded payload: `{"topics":["dispute_vote_cast","SHIP-2026-001"],"data":[1,"G...EXAMPLE",true,1]}`

## `dispute_withdrawn`

### Schema

- Topics: `(Symbol::new(&env, "dispute_withdrawn"), shipment_id.clone())`
- Data shape: `(milestone_index, buyer)`
- Payload fields: `milestone_index`, `buyer`
- Emitting function(s): `withdraw_dispute` ([lib.rs:18654](../contracts/stellarsettle/src/lib.rs#L18654))
- Sample decoded payload: `{"topics":["dispute_withdrawn","SHIP-2026-001"],"data":[1,"G...EXAMPLE"]}`

## `dual_proof_pending`

### Schema

- Topics: `(Symbol::new(&env, "dual_proof_pending"), shipment_id.clone())`
- Data shape: `(milestone_index, proof_hash, proof_type, caller)`
- Payload fields: `milestone_index`, `proof_hash`, `proof_type`, `caller`
- Emitting function(s): `submit_proof` ([lib.rs:8818](../contracts/stellarsettle/src/lib.rs#L8818))
- Sample decoded payload: `{"topics":["dual_proof_pending","SHIP-2026-001"],"data":[1,"abc123","proof_type","G...EXAMPLE"]}`

## `emergency_freeze_activated`

### Schema 1

- Topics: `(Symbol::new(&env, "emergency_freeze_activated"),)`
- Data shape: `(admin, env.ledger().sequence())`
- Payload fields: `admin`, `ledger_sequence`
- Emitting function(s): `propose_emergency_freeze` ([lib.rs:2323](../contracts/stellarsettle/src/lib.rs#L2323))
- Sample decoded payload: `{"topics":["emergency_freeze_activated"],"data":["G...EXAMPLE",1]}`

### Schema 2

- Topics: `(Symbol::new(env, "emergency_freeze_activated"),)`
- Data shape: `proposal_id`
- Payload fields: `proposal_id`
- Emitting function(s): `execute_emergency_freeze_proposal` ([lib.rs:2412](../contracts/stellarsettle/src/lib.rs#L2412))
- Sample decoded payload: `{"topics":["emergency_freeze_activated"],"data":1}`

## `emergency_freeze_approved`

### Schema

- Topics: `(Symbol::new(&env, "emergency_freeze_approved"), proposal_id)`
- Data shape: `(admin, approvals_count)`
- Payload fields: `admin`, `approvals_count`
- Emitting function(s): `approve_emergency_freeze` ([lib.rs:2391](../contracts/stellarsettle/src/lib.rs#L2391))
- Sample decoded payload: `{"topics":["emergency_freeze_approved",1],"data":["G...EXAMPLE",1]}`

## `emergency_freeze_lifted`

### Schema 1

- Topics: `(Symbol::new(&env, "emergency_freeze_lifted"),)`
- Data shape: `(admin, env.ledger().sequence())`
- Payload fields: `admin`, `ledger_sequence`
- Emitting function(s): `propose_emergency_unfreeze` ([lib.rs:2430](../contracts/stellarsettle/src/lib.rs#L2430))
- Sample decoded payload: `{"topics":["emergency_freeze_lifted"],"data":["G...EXAMPLE",1]}`

### Schema 2

- Topics: `(Symbol::new(env, "emergency_freeze_lifted"),)`
- Data shape: `proposal_id`
- Payload fields: `proposal_id`
- Emitting function(s): `execute_emergency_unfreeze_proposal` ([lib.rs:2525](../contracts/stellarsettle/src/lib.rs#L2525))
- Sample decoded payload: `{"topics":["emergency_freeze_lifted"],"data":1}`

## `emergency_freeze_proposed`

### Schema

- Topics: `(Symbol::new(&env, "emergency_freeze_proposed"), proposal_id)`
- Data shape: `(admin, 1u32)`
- Payload fields: `admin`, `u32`
- Emitting function(s): `propose_emergency_freeze` ([lib.rs:2354](../contracts/stellarsettle/src/lib.rs#L2354))
- Sample decoded payload: `{"topics":["emergency_freeze_proposed",1],"data":["G...EXAMPLE",1]}`

## `emergency_recovery`

### Schema

- Topics: `(Symbol::new(env, "emergency_recovery"), shipment_id.clone())`
- Data shape: `(recovery_amount, admin.clone())`
- Payload fields: `recovery_amount`, `admin`
- Emitting function(s): `do_emergency_recover` ([lib.rs:12968](../contracts/stellarsettle/src/lib.rs#L12968))
- Sample decoded payload: `{"topics":["emergency_recovery","SHIP-2026-001"],"data":[1,"G...EXAMPLE"]}`

## `emergency_unfreeze_approved`

### Schema

- Topics: `( Symbol::new(&env, "emergency_unfreeze_approved"), proposal_id, )`
- Data shape: `(admin, approvals_count)`
- Payload fields: `admin`, `approvals_count`
- Emitting function(s): `approve_emergency_unfreeze` ([lib.rs:2501](../contracts/stellarsettle/src/lib.rs#L2501))
- Sample decoded payload: `{"topics":["emergency_unfreeze_approved",1],"data":["G...EXAMPLE",1]}`

## `emergency_unfreeze_proposed`

### Schema

- Topics: `( Symbol::new(&env, "emergency_unfreeze_proposed"), proposal_id, )`
- Data shape: `(admin, 1u32)`
- Payload fields: `admin`, `u32`
- Emitting function(s): `propose_emergency_unfreeze` ([lib.rs:2461](../contracts/stellarsettle/src/lib.rs#L2461))
- Sample decoded payload: `{"topics":["emergency_unfreeze_proposed",1],"data":["G...EXAMPLE",1]}`

## `escalation_threshold_set`

### Schema

- Topics: `(Symbol::new(&env, "escalation_threshold_set"),)`
- Data shape: `threshold_ledgers`
- Payload fields: `threshold_ledgers`
- Emitting function(s): `set_escalation_threshold` ([lib.rs:2717](../contracts/stellarsettle/src/lib.rs#L2717))
- Sample decoded payload: `{"topics":["escalation_threshold_set"],"data":1}`

## `escrow_topped_up`

### Schema

- Topics: `(Symbol::new(&env, "escrow_topped_up"), shipment_id.clone())`
- Data shape: `(additional_amount, new_total)`
- Payload fields: `additional_amount`, `new_total`
- Emitting function(s): `top_up_escrow` ([lib.rs:7824](../contracts/stellarsettle/src/lib.rs#L7824))
- Sample decoded payload: `{"topics":["escrow_topped_up","SHIP-2026-001"],"data":[1,1]}`

## `expiry_extended`

### Schema

- Topics: `(Symbol::new(&env, "expiry_extended"), shipment_id)`
- Data shape: `(old_expiry, proposal.new_expiry_ledger, counterparty)`
- Payload fields: `old_expiry`, `new_expiry_ledger`, `counterparty`
- Emitting function(s): `approve_expiry_extension` ([lib.rs:14207](../contracts/stellarsettle/src/lib.rs#L14207))
- Sample decoded payload: `{"topics":["expiry_extended","SHIP-2026-001"],"data":[1,1,"G...EXAMPLE"]}`

## `expiry_extension_proposed`

### Schema

- Topics: `( Symbol::new(&env, "expiry_extension_proposed"), shipment_id, )`
- Data shape: `(caller, current, new_expiry_ledger)`
- Payload fields: `caller`, `current`, `new_expiry_ledger`
- Emitting function(s): `propose_expiry_extension` ([lib.rs:14134](../contracts/stellarsettle/src/lib.rs#L14134))
- Sample decoded payload: `{"topics":["expiry_extension_proposed","SHIP-2026-001"],"data":["G...EXAMPLE",1,1]}`

## `extension_approved`

### Schema

- Topics: `(Symbol::new(&env, "extension_approved"), shipment_id)`
- Data shape: `(milestone_index, new_deadline, buyer)`
- Payload fields: `milestone_index`, `new_deadline`, `buyer`
- Emitting function(s): `approve_extension` ([lib.rs:6303](../contracts/stellarsettle/src/lib.rs#L6303))
- Sample decoded payload: `{"topics":["extension_approved","SHIP-2026-001"],"data":[1,1,"G...EXAMPLE"]}`

## `extension_denied`

### Schema

- Topics: `(Symbol::new(&env, "extension_denied"), shipment_id)`
- Data shape: `(milestone_index, buyer)`
- Payload fields: `milestone_index`, `buyer`
- Emitting function(s): `deny_extension` ([lib.rs:6322](../contracts/stellarsettle/src/lib.rs#L6322))
- Sample decoded payload: `{"topics":["extension_denied","SHIP-2026-001"],"data":[1,"G...EXAMPLE"]}`

## `extension_requested`

### Schema

- Topics: `(Symbol::new(&env, "extension_requested"), shipment_id)`
- Data shape: `(milestone_index, extra_ledgers, caller)`
- Payload fields: `milestone_index`, `extra_ledgers`, `caller`
- Emitting function(s): `request_extension` ([lib.rs:6269](../contracts/stellarsettle/src/lib.rs#L6269))
- Sample decoded payload: `{"topics":["extension_requested","SHIP-2026-001"],"data":[1,1,"G...EXAMPLE"]}`

## `fee_holiday_scheduled`

### Schema

- Topics: `(Symbol::new(&env, "fee_holiday_scheduled"),)`
- Data shape: `(start_ledger, end_ledger)`
- Payload fields: `start_ledger`, `end_ledger`
- Emitting function(s): `schedule_fee_holiday` ([lib.rs:3222](../contracts/stellarsettle/src/lib.rs#L3222))
- Sample decoded payload: `{"topics":["fee_holiday_scheduled"],"data":[1,1]}`

## `fee_recipients_set`

### Schema

- Topics: `(Symbol::new(&env, "fee_recipients_set"),)`
- Data shape: `(recipients.len(), env.ledger().sequence())`
- Payload fields: `value_1`, `ledger_sequence`
- Emitting function(s): `set_fee_recipients` ([lib.rs:3275](../contracts/stellarsettle/src/lib.rs#L3275))
- Sample decoded payload: `{"topics":["fee_recipients_set"],"data":[1,1]}`

## `fee_tiers_set`

### Schema

- Topics: `(Symbol::new(&env, "fee_tiers_set"),)`
- Data shape: `tiers.len() as u32`
- Payload fields: `u32`
- Emitting function(s): `set_fee_tiers` ([lib.rs:6090](../contracts/stellarsettle/src/lib.rs#L6090))
- Sample decoded payload: `{"topics":["fee_tiers_set"],"data":1}`

## `fee_waiver_approved`

### Schema

- Topics: `(Symbol::new(&env, "fee_waiver_approved"), proposal_id)`
- Data shape: `(admin, approvals_count)`
- Payload fields: `admin`, `approvals_count`
- Emitting function(s): `approve_fee_waiver` ([lib.rs:2642](../contracts/stellarsettle/src/lib.rs#L2642))
- Sample decoded payload: `{"topics":["fee_waiver_approved",1],"data":["G...EXAMPLE",1]}`

## `fee_waiver_granted`

### Schema

- Topics: `(Symbol::new(env, "fee_waiver_granted"), proposal_id)`
- Data shape: `(proposal.partner, proposal.waiver_bps, proposal.expires_at)`
- Payload fields: `partner`, `waiver_bps`, `expires_at`
- Emitting function(s): `execute_fee_waiver_proposal` ([lib.rs:2671](../contracts/stellarsettle/src/lib.rs#L2671))
- Sample decoded payload: `{"topics":["fee_waiver_granted",1],"data":[1,1,1]}`

## `fee_waiver_proposed`

### Schema

- Topics: `(Symbol::new(&env, "fee_waiver_proposed"), proposal_id)`
- Data shape: `(admin, partner, waiver_bps, 1u32)`
- Payload fields: `admin`, `partner`, `waiver_bps`, `u32`
- Emitting function(s): `propose_fee_waiver` ([lib.rs:2607](../contracts/stellarsettle/src/lib.rs#L2607))
- Sample decoded payload: `{"topics":["fee_waiver_proposed",1],"data":["G...EXAMPLE",1,1,1]}`

## `finality_delay_ledgers_set`

### Schema

- Topics: `(Symbol::new(&env, "finality_delay_ledgers_set"),)`
- Data shape: `ledgers`
- Payload fields: `ledgers`
- Emitting function(s): `set_finality_delay_ledgers` ([lib.rs:2877](../contracts/stellarsettle/src/lib.rs#L2877))
- Sample decoded payload: `{"topics":["finality_delay_ledgers_set"],"data":1}`

## `freeze_supermajority_bps_set`

### Schema

- Topics: `(Symbol::new(&env, "freeze_supermajority_bps_set"),)`
- Data shape: `bps`
- Payload fields: `bps`
- Emitting function(s): `set_freeze_supermajority_bps` ([lib.rs:2280](../contracts/stellarsettle/src/lib.rs#L2280))
- Sample decoded payload: `{"topics":["freeze_supermajority_bps_set"],"data":1}`

## `grade_disputed`

### Schema

- Topics: `(Symbol::new(&env, "grade_disputed"), shipment_id.clone())`
- Data shape: `(milestone_index, grade.0, grade.1, buyer.clone())`
- Payload fields: `milestone_index`, `value_2`, `value_3`, `buyer`
- Emitting function(s): `raise_dispute` ([lib.rs:10490](../contracts/stellarsettle/src/lib.rs#L10490))
- Sample decoded payload: `{"topics":["grade_disputed","SHIP-2026-001"],"data":[1,1,1,"G...EXAMPLE"]}`

## `grade_settled`

### Schema 1

- Topics: `(Symbol::new(&env, "grade_settled"), shipment_id.clone())`
- Data shape: `(milestone_index, grade, grade_bps, payment, grade_refund)`
- Payload fields: `milestone_index`, `grade`, `grade_bps`, `payment`, `grade_refund`
- Emitting function(s): `release_held_payment` ([lib.rs:10050](../contracts/stellarsettle/src/lib.rs#L10050))
- Sample decoded payload: `{"topics":["grade_settled","SHIP-2026-001"],"data":[1,1,1,1,1]}`

### Schema 2

- Topics: `(Symbol::new(&env, "grade_settled"), shipment_id.clone())`
- Data shape: `(milestone_index, grade, grade_bps, payment - contested, buyer_refund)`
- Payload fields: `milestone_index`, `grade`, `grade_bps`, `contested`, `buyer_refund`
- Emitting function(s): `resolve_dispute` ([lib.rs:11055](../contracts/stellarsettle/src/lib.rs#L11055))
- Sample decoded payload: `{"topics":["grade_settled","SHIP-2026-001"],"data":[1,1,1,1,"G...EXAMPLE"]}`

## `held_payment_released`

### Schema

- Topics: `( Symbol::new(&env, "held_payment_released"), shipment_id.clone(), )`
- Data shape: `(milestone_index, payment, fee_amount)`
- Payload fields: `milestone_index`, `payment`, `fee_amount`
- Emitting function(s): `release_held_payment` ([lib.rs:10110](../contracts/stellarsettle/src/lib.rs#L10110))
- Sample decoded payload: `{"topics":["held_payment_released","SHIP-2026-001"],"data":[1,1,1]}`

## `holdback_refunded`

### Schema

- Topics: `(Symbol::new(env, "holdback_refunded"), shipment_id.clone())`
- Data shape: `(primary_buyer, retainage, warranty)`
- Payload fields: `primary_buyer`, `retainage`, `warranty`
- Emitting function(s): `refund_holdbacks_on_cancel` ([lib.rs:21555](../contracts/stellarsettle/src/lib.rs#L21555))
- Sample decoded payload: `{"topics":["holdback_refunded","SHIP-2026-001"],"data":["G...EXAMPLE",1,1]}`

## `holdback_withheld`

### Schema

- Topics: `(Symbol::new(env, "holdback_withheld"), shipment_id.clone())`
- Data shape: `(milestone_index, retained, warranty)`
- Payload fields: `milestone_index`, `retained`, `warranty`
- Emitting function(s): `withhold_settlement_holdbacks` ([lib.rs:21447](../contracts/stellarsettle/src/lib.rs#L21447))
- Sample decoded payload: `{"topics":["holdback_withheld","SHIP-2026-001"],"data":[1,1,1]}`

## `incremental_collateral_set`

### Schema

- Topics: `(Symbol::new(&env, "incremental_collateral_set"), shipment_id)`
- Data shape: `(buyer, enabled)`
- Payload fields: `buyer`, `enabled`
- Emitting function(s): `set_incremental_collateral` ([lib.rs:3987](../contracts/stellarsettle/src/lib.rs#L3987))
- Sample decoded payload: `{"topics":["incremental_collateral_set","SHIP-2026-001"],"data":["G...EXAMPLE",true]}`

## `inspector_signed_off`

### Schema

- Topics: `(Symbol::new(&env, "inspector_signed_off"), shipment_id)`
- Data shape: `(milestone_index, report_hash, inspector)`
- Payload fields: `milestone_index`, `report_hash`, `inspector`
- Emitting function(s): `inspector_sign_off` ([lib.rs:13918](../contracts/stellarsettle/src/lib.rs#L13918))
- Sample decoded payload: `{"topics":["inspector_signed_off","SHIP-2026-001"],"data":[1,"abc123","G...EXAMPLE"]}`

## `invoice_hash_attached`

### Schema

- Topics: `(Symbol::new(&env, "invoice_hash_attached"), shipment_id)`
- Data shape: `(milestone_index, invoice_hash, caller)`
- Payload fields: `milestone_index`, `invoice_hash`, `caller`
- Emitting function(s): `attach_invoice_hash` ([lib.rs:6167](../contracts/stellarsettle/src/lib.rs#L6167))
- Sample decoded payload: `{"topics":["invoice_hash_attached","SHIP-2026-001"],"data":[1,"abc123","G...EXAMPLE"]}`

## `joint_confirmation_recorded`

### Schema

- Topics: `( Symbol::new(env, "joint_confirmation_recorded"), shipment_id.clone(), )`
- Data shape: `( milestone_index, caller.clone(), status.buyer_confirmed, status.co_buyer_confirmed, )`
- Payload fields: `milestone_index`, `caller`, `buyer_confirmed`, `co_buyer_confirmed`
- Emitting function(s): `record_joint_confirmation` ([lib.rs:8579](../contracts/stellarsettle/src/lib.rs#L8579))
- Sample decoded payload: `{"topics":["joint_confirmation_recorded","SHIP-2026-001"],"data":[1,"G...EXAMPLE",true,true]}`

## `joint_confirmation_threshold_set`

### Schema

- Topics: `(Symbol::new(&env, "joint_confirmation_threshold_set"),)`
- Data shape: `threshold`
- Payload fields: `threshold`
- Emitting function(s): `set_joint_confirmation_threshold` ([lib.rs:2792](../contracts/stellarsettle/src/lib.rs#L2792))
- Sample decoded payload: `{"topics":["joint_confirmation_threshold_set"],"data":1}`

## `logistics_transferred`

### Schema

- Topics: `( Symbol::new(&env, "logistics_transferred"), shipment_id.clone(), )`
- Data shape: `(current_logistics, new_logistics)`
- Payload fields: `current_logistics`, `new_logistics`
- Emitting function(s): `transfer_logistics` ([lib.rs:12427](../contracts/stellarsettle/src/lib.rs#L12427))
- Sample decoded payload: `{"topics":["logistics_transferred","SHIP-2026-001"],"data":[1,1]}`

## `long_hold_rebate_set`

### Schema

- Topics: `(Symbol::new(&env, "long_hold_rebate_set"),)`
- Data shape: `(threshold_ledgers, rebate_bps)`
- Payload fields: `threshold_ledgers`, `rebate_bps`
- Emitting function(s): `set_long_hold_rebate` ([lib.rs:14875](../contracts/stellarsettle/src/lib.rs#L14875))
- Sample decoded payload: `{"topics":["long_hold_rebate_set"],"data":[1,1]}`

## `loser_pays_arbiter_fee_set`

### Schema

- Topics: `(Symbol::new(&env, "loser_pays_arbiter_fee_set"), shipment_id)`
- Data shape: `enabled`
- Payload fields: `enabled`
- Emitting function(s): `set_loser_pays_arbiter_fee` ([lib.rs:20248](../contracts/stellarsettle/src/lib.rs#L20248))
- Sample decoded payload: `{"topics":["loser_pays_arbiter_fee_set","SHIP-2026-001"],"data":true}`

## `max_allowed_tokens_set`

### Schema

- Topics: `(Symbol::new(&env, "max_allowed_tokens_set"),)`
- Data shape: `max_allowed`
- Payload fields: `max_allowed`
- Emitting function(s): `set_max_allowed_tokens` ([lib.rs:6387](../contracts/stellarsettle/src/lib.rs#L6387))
- Sample decoded payload: `{"topics":["max_allowed_tokens_set"],"data":1}`

## `max_dispute_bond_bps_set`

### Schema

- Topics: `(Symbol::new(&env, "max_dispute_bond_bps_set"),)`
- Data shape: `max_bps`
- Payload fields: `max_bps`
- Emitting function(s): `set_max_dispute_bond_bps` ([lib.rs:2923](../contracts/stellarsettle/src/lib.rs#L2923))
- Sample decoded payload: `{"topics":["max_dispute_bond_bps_set"],"data":1}`

## `max_evidence_updated`

### Schema

- Topics: `(Symbol::new(&env, "max_evidence_updated"),)`
- Data shape: `(admin, max_count, env.ledger().sequence())`
- Payload fields: `admin`, `max_count`, `ledger_sequence`
- Emitting function(s): `set_max_evidence_per_milestone` ([lib.rs:5509](../contracts/stellarsettle/src/lib.rs#L5509))
- Sample decoded payload: `{"topics":["max_evidence_updated"],"data":["G...EXAMPLE",1,1]}`

## `max_expiry_ext_set`

### Schema

- Topics: `(Symbol::new(&env, "max_expiry_ext_set"),)`
- Data shape: `ledgers`
- Payload fields: `ledgers`
- Emitting function(s): `set_max_expiry_extension_ledgers` ([lib.rs:14079](../contracts/stellarsettle/src/lib.rs#L14079))
- Sample decoded payload: `{"topics":["max_expiry_ext_set"],"data":1}`

## `max_extension_requests_set`

### Schema

- Topics: `(Symbol::new(&env, "max_extension_requests_set"),)`
- Data shape: `max_requests`
- Payload fields: `max_requests`
- Emitting function(s): `set_max_extension_requests` ([lib.rs:19854](../contracts/stellarsettle/src/lib.rs#L19854))
- Sample decoded payload: `{"topics":["max_extension_requests_set"],"data":1}`

## `max_milestone_count_set`

### Schema

- Topics: `(Symbol::new(&env, "max_milestone_count_set"),)`
- Data shape: `count`
- Payload fields: `count`
- Emitting function(s): `set_max_milestone_count` ([lib.rs:19830](../contracts/stellarsettle/src/lib.rs#L19830))
- Sample decoded payload: `{"topics":["max_milestone_count_set"],"data":1}`

## `max_overturned_before_slash_set`

### Schema

- Topics: `(Symbol::new(&env, "max_overturned_before_slash_set"),)`
- Data shape: `threshold`
- Payload fields: `threshold`
- Emitting function(s): `set_max_overturned_before_slash` ([lib.rs:6825](../contracts/stellarsettle/src/lib.rs#L6825))
- Sample decoded payload: `{"topics":["max_overturned_before_slash_set"],"data":1}`

## `max_shipment_value_set`

### Schema

- Topics: `(Symbol::new(&env, "max_shipment_value_set"),)`
- Data shape: `max_value`
- Payload fields: `max_value`
- Emitting function(s): `set_max_shipment_value` ([lib.rs:2901](../contracts/stellarsettle/src/lib.rs#L2901))
- Sample decoded payload: `{"topics":["max_shipment_value_set"],"data":1}`

## `max_summary_batch_set`

### Schema

- Topics: `(Symbol::new(&env, "max_summary_batch_set"),)`
- Data shape: `max`
- Payload fields: `max`
- Emitting function(s): `set_max_summary_batch` ([lib.rs:16844](../contracts/stellarsettle/src/lib.rs#L16844))
- Sample decoded payload: `{"topics":["max_summary_batch_set"],"data":1}`

## `mediation_accepted`

### Schema

- Topics: `(Symbol::new(env, "mediation_accepted"), shipment_id.clone())`
- Data shape: `(milestone_index, resolution_sym.clone(), mediator.clone())`
- Payload fields: `milestone_index`, `resolution_sym`, `mediator`
- Emitting function(s): `apply_mediation_outcome` ([lib.rs:13664](../contracts/stellarsettle/src/lib.rs#L13664))
- Sample decoded payload: `{"topics":["mediation_accepted","SHIP-2026-001"],"data":[1,"resolution_sym","G...EXAMPLE"]}`

## `mediation_declined`

### Schema

- Topics: `(Symbol::new(&env, "mediation_declined"), shipment_id)`
- Data shape: `(milestone_index, caller)`
- Payload fields: `milestone_index`, `caller`
- Emitting function(s): `decline_mediation` ([lib.rs:13463](../contracts/stellarsettle/src/lib.rs#L13463))
- Sample decoded payload: `{"topics":["mediation_declined","SHIP-2026-001"],"data":[1,"G...EXAMPLE"]}`

## `mediation_proposed`

### Schema

- Topics: `(Symbol::new(&env, "mediation_proposed"), shipment_id)`
- Data shape: `(milestone_index, mediator, outcome_sym)`
- Payload fields: `milestone_index`, `mediator`, `outcome_sym`
- Emitting function(s): `propose_mediation` ([lib.rs:13396](../contracts/stellarsettle/src/lib.rs#L13396))
- Sample decoded payload: `{"topics":["mediation_proposed","SHIP-2026-001"],"data":[1,"G...EXAMPLE",1]}`

## `mediator_assigned`

### Schema

- Topics: `(Symbol::new(&env, "mediator_assigned"), shipment_id)`
- Data shape: `mediator`
- Payload fields: `mediator`
- Emitting function(s): `assign_mediator` ([lib.rs:13285](../contracts/stellarsettle/src/lib.rs#L13285))
- Sample decoded payload: `{"topics":["mediator_assigned","SHIP-2026-001"],"data":"G...EXAMPLE"}`

## `mediator_pool_set`

### Schema

- Topics: `(Symbol::new(&env, "mediator_pool_set"),)`
- Data shape: `mediators.len() as u32`
- Payload fields: `u32`
- Emitting function(s): `set_mediator_pool` ([lib.rs:13300](../contracts/stellarsettle/src/lib.rs#L13300))
- Sample decoded payload: `{"topics":["mediator_pool_set"],"data":1}`

## `milestone_confirmed`

### Schema 1

- Topics: `( Symbol::new(&env, "milestone_confirmed"), shipment_id.clone(), )`
- Data shape: `( milestone_index, payment, fee_amount, penalty_deducted, shipment.supplier.clone(), env.ledger().sequence(), shipment.released_amount, remaining_amount, applied_fee_bps, )`
- Payload fields: `milestone_index`, `payment`, `fee_amount`, `penalty_deducted`, `supplier`, `ledger_sequence`, `released_amount`, `remaining_amount`, `applied_fee_bps`
- Emitting function(s): `confirm_milestone` ([lib.rs:9879](../contracts/stellarsettle/src/lib.rs#L9879))
- Sample decoded payload: `{"topics":["milestone_confirmed","SHIP-2026-001"],"data":[1,1,1,1,"G...EXAMPLE",1,1,1,1]}`

### Schema 2

- Topics: `( Symbol::new(&env, "milestone_confirmed"), shipment_id.clone(), )`
- Data shape: `( idx, payment, fee_amount, shipment.supplier.clone(), env.ledger().sequence(), shipment.released_amount, remaining_amount, )`
- Payload fields: `idx`, `payment`, `fee_amount`, `supplier`, `ledger_sequence`, `released_amount`, `remaining_amount`
- Emitting function(s): `batch_confirm_milestones` ([lib.rs:10263](../contracts/stellarsettle/src/lib.rs#L10263))
- Sample decoded payload: `{"topics":["milestone_confirmed","SHIP-2026-001"],"data":[1,1,1,"G...EXAMPLE",1,1,1]}`

### Schema 3

- Topics: `( Symbol::new(env, "stellarsettle"), Symbol::new(env, "milestone_confirmed"), )`
- Data shape: `data`
- Payload fields: `data`
- Emitting function(s): `emit_milestone_confirmed`, `batch_confirm_milestones`, `claim_auto_confirmation`, `confirm_milestone`, `release_held_payment` ([lib.rs:19711](../contracts/stellarsettle/src/lib.rs#L19711))
- Sample decoded payload: `{"topics":["stellarsettle","milestone_confirmed"],"data":{"shipment_id":"SHIP-2026-001","milestone_index":1,"payout_amount":1}}`

## `milestone_expired`

### Schema

- Topics: `(Symbol::new(&env, "milestone_expired"), shipment_id.clone())`
- Data shape: `(milestone_index, refund_amount, primary_buyer)`
- Payload fields: `milestone_index`, `refund_amount`, `primary_buyer`
- Emitting function(s): `claim_deadline_refund` ([lib.rs:14436](../contracts/stellarsettle/src/lib.rs#L14436))
- Sample decoded payload: `{"topics":["milestone_expired","SHIP-2026-001"],"data":[1,1,"G...EXAMPLE"]}`

## `milestone_graded`

### Schema

- Topics: `(Symbol::new(env, "milestone_graded"), shipment_id.clone())`
- Data shape: `( milestone_index, grade_index, grade_bps, payout, refund, release_after_ledger, )`
- Payload fields: `milestone_index`, `grade_index`, `grade_bps`, `payout`, `refund`, `release_after_ledger`
- Emitting function(s): `record_milestone_grade` ([lib.rs:21310](../contracts/stellarsettle/src/lib.rs#L21310))
- Sample decoded payload: `{"topics":["milestone_graded","SHIP-2026-001"],"data":[1,1,1,1,1,1]}`

## `milestone_merge_proposed`

### Schema

- Topics: `(Symbol::new(&env, "milestone_merge_proposed"), shipment_id)`
- Data shape: `(first_index, caller)`
- Payload fields: `first_index`, `caller`
- Emitting function(s): `propose_milestone_merge` ([lib.rs:4490](../contracts/stellarsettle/src/lib.rs#L4490))
- Sample decoded payload: `{"topics":["milestone_merge_proposed","SHIP-2026-001"],"data":[1,"G...EXAMPLE"]}`

## `milestone_note_added`

### Schema

- Topics: `( Symbol::new(&env, "milestone_note_added"), shipment_id, milestone_index, )`
- Data shape: `(caller, note)`
- Payload fields: `caller`, `note`
- Emitting function(s): `add_milestone_note` ([lib.rs:16568](../contracts/stellarsettle/src/lib.rs#L16568))
- Sample decoded payload: `{"topics":["milestone_note_added","SHIP-2026-001",1],"data":["G...EXAMPLE",1]}`

## `milestone_payees_set`

### Schema

- Topics: `(Symbol::new(&env, "milestone_payees_set"), shipment_id)`
- Data shape: `(milestone_index, payees.len() as u32, buyer)`
- Payload fields: `milestone_index`, `u32`, `buyer`
- Emitting function(s): `set_milestone_payees` ([lib.rs:16039](../contracts/stellarsettle/src/lib.rs#L16039))
- Sample decoded payload: `{"topics":["milestone_payees_set","SHIP-2026-001"],"data":[1,1,"G...EXAMPLE"]}`

## `milestone_split_proposed`

### Schema

- Topics: `(Symbol::new(&env, "milestone_split_proposed"), shipment_id)`
- Data shape: `(milestone_index, caller, parts.len())`
- Payload fields: `milestone_index`, `caller`, `value_3`
- Emitting function(s): `propose_milestone_split` ([lib.rs:4700](../contracts/stellarsettle/src/lib.rs#L4700))
- Sample decoded payload: `{"topics":["milestone_split_proposed","SHIP-2026-001"],"data":[1,"G...EXAMPLE",1]}`

## `milestone_template_saved`

### Schema

- Topics: `(Symbol::new(&env, "milestone_template_saved"), creator)`
- Data shape: `name`
- Payload fields: `name`
- Emitting function(s): `save_milestone_template` ([lib.rs:20022](../contracts/stellarsettle/src/lib.rs#L20022))
- Sample decoded payload: `{"topics":["milestone_template_saved",1],"data":"name"}`

## `milestones_merged`

### Schema

- Topics: `(Symbol::new(&env, "milestones_merged"), shipment_id)`
- Data shape: `( first_index, merged.payment_percent, merged.deadline_ledger, counterparty, )`
- Payload fields: `first_index`, `payment_percent`, `deadline_ledger`, `counterparty`
- Emitting function(s): `approve_milestone_merge` ([lib.rs:4642](../contracts/stellarsettle/src/lib.rs#L4642))
- Sample decoded payload: `{"topics":["milestones_merged","SHIP-2026-001"],"data":[1,1,1,"G...EXAMPLE"]}`

## `milestones_rebalanced`

### Schema

- Topics: `( Symbol::new(&env, "milestones_rebalanced"), shipment_id.clone(), )`
- Data shape: `(buyer, new_percents)`
- Payload fields: `buyer`, `new_percents`
- Emitting function(s): `rebalance_milestones` ([lib.rs:8234](../contracts/stellarsettle/src/lib.rs#L8234))
- Sample decoded payload: `{"topics":["milestones_rebalanced","SHIP-2026-001"],"data":["G...EXAMPLE",1]}`

## `milestones_split`

### Schema

- Topics: `(Symbol::new(&env, "milestones_split"), shipment_id)`
- Data shape: `(milestone_index, part_count, counterparty)`
- Payload fields: `milestone_index`, `part_count`, `counterparty`
- Emitting function(s): `approve_milestone_split` ([lib.rs:4892](../contracts/stellarsettle/src/lib.rs#L4892))
- Sample decoded payload: `{"topics":["milestones_split","SHIP-2026-001"],"data":[1,1,"G...EXAMPLE"]}`

## `min_shipment_value_set`

### Schema

- Topics: `(Symbol::new(&env, "min_shipment_value_set"),)`
- Data shape: `min_amount`
- Payload fields: `min_amount`
- Emitting function(s): `set_min_shipment_value` ([lib.rs:14784](../contracts/stellarsettle/src/lib.rs#L14784))
- Sample decoded payload: `{"topics":["min_shipment_value_set"],"data":1}`

## `multisig_admin_initialized`

### Schema

- Topics: `(Symbol::new(&env, "multisig_admin_initialized"),)`
- Data shape: `threshold`
- Payload fields: `threshold`
- Emitting function(s): `initialize_multisig_admin` ([lib.rs:3092](../contracts/stellarsettle/src/lib.rs#L3092))
- Sample decoded payload: `{"topics":["multisig_admin_initialized"],"data":1}`

## `mutual_preapproval_updated`

### Schema

- Topics: `(Symbol::new(&env, "mutual_preapproval_updated"),)`
- Data shape: `(admin, enabled, env.ledger().sequence())`
- Payload fields: `admin`, `enabled`, `ledger_sequence`
- Emitting function(s): `set_require_mutual_preapproval` ([lib.rs:5989](../contracts/stellarsettle/src/lib.rs#L5989))
- Sample decoded payload: `{"topics":["mutual_preapproval_updated"],"data":["G...EXAMPLE",true,1]}`

## `nft_hook_config_updated`

### Schema

- Topics: `(Symbol::new(&env, "nft_hook_config_updated"),)`
- Data shape: `(admin, enabled, env.ledger().sequence())`
- Payload fields: `admin`, `enabled`, `ledger_sequence`
- Emitting function(s): `set_nft_hook_enabled` ([lib.rs:5711](../contracts/stellarsettle/src/lib.rs#L5711))
- Sample decoded payload: `{"topics":["nft_hook_config_updated"],"data":["G...EXAMPLE",true,1]}`

## `nft_mint_hook`

### Schema

- Topics: `(Symbol::new(&env, "nft_mint_hook"), shipment_id.clone())`
- Data shape: `( shipment.buyers.get(0).unwrap(), shipment.supplier.clone(), shipment.total_amount, env.ledger().sequence(), shipment.metadata_hash.clone(), )`
- Payload fields: `value_1`, `supplier`, `total_amount`, `ledger_sequence`, `metadata_hash`
- Emitting function(s): `confirm_milestone` ([lib.rs:9847](../contracts/stellarsettle/src/lib.rs#L9847))
- Sample decoded payload: `{"topics":["nft_mint_hook","SHIP-2026-001"],"data":[1,"G...EXAMPLE",1,1,"abc123"]}`

## `nomination_revoked`

### Schema

- Topics: `(Symbol::new(&env, "nomination_revoked"),)`
- Data shape: `env.ledger().sequence()`
- Payload fields: `ledger_sequence`
- Emitting function(s): `revoke_nomination` ([lib.rs:12889](../contracts/stellarsettle/src/lib.rs#L12889))
- Sample decoded payload: `{"topics":["nomination_revoked"],"data":1}`

## `observer_added`

### Schema

- Topics: `( Symbol::new(&env, "observer_added"), shipment_id.clone(), )`
- Data shape: `(buyer, observer_address)`
- Payload fields: `buyer`, `observer_address`
- Emitting function(s): `add_shipment_observer` ([lib.rs:5631](../contracts/stellarsettle/src/lib.rs#L5631))
- Sample decoded payload: `{"topics":["observer_added","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE"]}`

## `observer_removed`

### Schema

- Topics: `( Symbol::new(&env, "observer_removed"), shipment_id.clone(), )`
- Data shape: `(buyer, observer_address)`
- Payload fields: `buyer`, `observer_address`
- Emitting function(s): `remove_shipment_observer` ([lib.rs:5682](../contracts/stellarsettle/src/lib.rs#L5682))
- Sample decoded payload: `{"topics":["observer_removed","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE"]}`

## `operation_paused_set`

### Schema

- Topics: `(Symbol::new(&env, "operation_paused_set"), op)`
- Data shape: `paused`
- Payload fields: `paused`
- Emitting function(s): `set_operation_paused` ([lib.rs:2228](../contracts/stellarsettle/src/lib.rs#L2228))
- Sample decoded payload: `{"topics":["operation_paused_set",1],"data":true}`

## `oracle_attestation_submitted`

### Schema

- Topics: `(Symbol::new(&env, "oracle_attestation_submitted"), shipment_id)`
- Data shape: `(milestone_index, oracle)`
- Payload fields: `milestone_index`, `oracle`
- Emitting function(s): `submit_oracle_attestation` ([lib.rs:13781](../contracts/stellarsettle/src/lib.rs#L13781))
- Sample decoded payload: `{"topics":["oracle_attestation_submitted","SHIP-2026-001"],"data":[1,"G...EXAMPLE"]}`

## `oracle_group_registered`

### Schema

- Topics: `(Symbol::new(&env, "oracle_group_registered"), purpose)`
- Data shape: `(oracles.len() as u32, threshold)`
- Payload fields: `u32`, `threshold`
- Emitting function(s): `register_oracle_group` ([lib.rs:13700](../contracts/stellarsettle/src/lib.rs#L13700))
- Sample decoded payload: `{"topics":["oracle_group_registered","purpose"],"data":[1,1]}`

## `panel_fee_distributed`

### Schema

- Topics: `(Symbol::new(env, "panel_fee_distributed"), shipment_id.clone())`
- Data shape: `(milestone_index, voters, distributed)`
- Payload fields: `milestone_index`, `voters`, `distributed`
- Emitting function(s): `distribute_panel_fee` ([lib.rs:15920](../contracts/stellarsettle/src/lib.rs#L15920))
- Sample decoded payload: `{"topics":["panel_fee_distributed","SHIP-2026-001"],"data":[1,1,1]}`

## `param_change_cancelled`

### Schema

- Topics: `(Symbol::new(&env, "param_change_cancelled"),)`
- Data shape: `param`
- Payload fields: `param`
- Emitting function(s): `cancel_param_change` ([lib.rs:15478](../contracts/stellarsettle/src/lib.rs#L15478))
- Sample decoded payload: `{"topics":["param_change_cancelled"],"data":1}`

## `param_change_executed`

### Schema

- Topics: `(Symbol::new(&env, "param_change_executed"), param)`
- Data shape: `new_value`
- Payload fields: `new_value`
- Emitting function(s): `execute_param_change` ([lib.rs:15453](../contracts/stellarsettle/src/lib.rs#L15453))
- Sample decoded payload: `{"topics":["param_change_executed",1],"data":1}`

## `param_change_proposed`

### Schema

- Topics: `(Symbol::new(&env, "param_change_proposed"), param)`
- Data shape: `(new_value, effective_ledger)`
- Payload fields: `new_value`, `effective_ledger`
- Emitting function(s): `propose_param_change` ([lib.rs:15405](../contracts/stellarsettle/src/lib.rs#L15405))
- Sample decoded payload: `{"topics":["param_change_proposed",1],"data":[1,1]}`

## `partial_dispute_raised`

### Schema

- Topics: `( Symbol::new(&env, "partial_dispute_raised"), shipment_id.clone(), )`
- Data shape: `(milestone_index, contested_percent, buyer.clone())`
- Payload fields: `milestone_index`, `contested_percent`, `buyer`
- Emitting function(s): `raise_partial_dispute` ([lib.rs:10815](../contracts/stellarsettle/src/lib.rs#L10815))
- Sample decoded payload: `{"topics":["partial_dispute_raised","SHIP-2026-001"],"data":[1,1,"G...EXAMPLE"]}`

## `partial_quantity_confirmed`

### Schema

- Topics: `( Symbol::new(env, "partial_quantity_confirmed"), shipment_id.clone(), )`
- Data shape: `( milestone_index, delivered, cumulative, expected, released, fee_amount, )`
- Payload fields: `milestone_index`, `delivered`, `cumulative`, `expected`, `released`, `fee_amount`
- Emitting function(s): `emit_partial_quantity_confirmed` ([lib.rs:21384](../contracts/stellarsettle/src/lib.rs#L21384))
- Sample decoded payload: `{"topics":["partial_quantity_confirmed","SHIP-2026-001"],"data":[1,1,1,1,1,1]}`

## `partial_uncontested_released`

### Schema

- Topics: `( Symbol::new(&env, "partial_uncontested_released"), shipment_id.clone(), )`
- Data shape: `(milestone_index, uncontested_payment, fee_amount)`
- Payload fields: `milestone_index`, `uncontested_payment`, `fee_amount`
- Emitting function(s): `raise_partial_dispute` ([lib.rs:10716](../contracts/stellarsettle/src/lib.rs#L10716))
- Sample decoded payload: `{"topics":["partial_uncontested_released","SHIP-2026-001"],"data":[1,1,1]}`

## `pause_min_notice_set`

### Schema

- Topics: `(Symbol::new(&env, "pause_min_notice_set"),)`
- Data shape: `ledgers`
- Payload fields: `ledgers`
- Emitting function(s): `set_pause_min_notice_ledgers` ([lib.rs:16297](../contracts/stellarsettle/src/lib.rs#L16297))
- Sample decoded payload: `{"topics":["pause_min_notice_set"],"data":1}`

## `payment_held`

### Schema

- Topics: `(Symbol::new(&env, "payment_held"), shipment_id.clone())`
- Data shape: `( milestone_index, milestone.release_after_ledger, penalty_deducted, early_bonus_paid, )`
- Payload fields: `milestone_index`, `release_after_ledger`, `penalty_deducted`, `early_bonus_paid`
- Emitting function(s): `confirm_milestone` ([lib.rs:9600](../contracts/stellarsettle/src/lib.rs#L9600))
- Sample decoded payload: `{"topics":["payment_held","SHIP-2026-001"],"data":[1,1,1,1]}`

## `payout_assigned`

### Schema

- Topics: `(Symbol::new(&env, "payout_assigned"), shipment_id)`
- Data shape: `(supplier, financier)`
- Payload fields: `supplier`, `financier`
- Emitting function(s): `assign_payout` ([lib.rs:20132](../contracts/stellarsettle/src/lib.rs#L20132))
- Sample decoded payload: `{"topics":["payout_assigned","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE"]}`

## `payout_assignment_released`

### Schema

- Topics: `(Symbol::new(&env, "payout_assignment_released"), shipment_id)`
- Data shape: `(assignment.supplier, financier)`
- Payload fields: `supplier`, `financier`
- Emitting function(s): `release_payout_assignment` ([lib.rs:20192](../contracts/stellarsettle/src/lib.rs#L20192))
- Sample decoded payload: `{"topics":["payout_assignment_released","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE"]}`

## `payout_assignment_transferred`

### Schema

- Topics: `(Symbol::new(&env, "payout_assignment_transferred"), shipment_id)`
- Data shape: `(financier, new_financier)`
- Payload fields: `financier`, `new_financier`
- Emitting function(s): `transfer_payout_assignment` ([lib.rs:20170](../contracts/stellarsettle/src/lib.rs#L20170))
- Sample decoded payload: `{"topics":["payout_assignment_transferred","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE"]}`

## `payout_claimed`

### Schema

- Topics: `(Symbol::new(&env, "payout_claimed"), supplier.clone())`
- Data shape: `( payout_amount, payout_token, rate_bps, )`
- Payload fields: `payout_amount`, `payout_token`, `rate_bps`
- Emitting function(s): `claim_payout` ([lib.rs:18333](../contracts/stellarsettle/src/lib.rs#L18333))
- Sample decoded payload: `{"topics":["payout_claimed","G...EXAMPLE"],"data":[1,"G...EXAMPLE",1]}`

## `payout_currency_preference_set`

### Schema

- Topics: `( Symbol::new(&env, "payout_currency_preference_set"), supplier, )`
- Data shape: `preferred_token`
- Payload fields: `preferred_token`
- Emitting function(s): `set_payout_currency_preference` ([lib.rs:18360](../contracts/stellarsettle/src/lib.rs#L18360))
- Sample decoded payload: `{"topics":["payout_currency_preference_set","G...EXAMPLE"],"data":"G...EXAMPLE"}`

## `payout_mode_set`

### Schema

- Topics: `(Symbol::new(&env, "payout_mode_set"), supplier.clone())`
- Data shape: `batched`
- Payload fields: `batched`
- Emitting function(s): `set_payout_mode` ([lib.rs:18266](../contracts/stellarsettle/src/lib.rs#L18266))
- Sample decoded payload: `{"topics":["payout_mode_set","G...EXAMPLE"],"data":true}`

## `proof_attested`

### Schema

- Topics: `(Symbol::new(&env, "proof_attested"), shipment_id.clone())`
- Data shape: `(milestone_index, proof_hash.clone(), caller, current_ledger)`
- Payload fields: `milestone_index`, `proof_hash`, `caller`, `current_ledger`
- Emitting function(s): `attest_proof` ([lib.rs:14042](../contracts/stellarsettle/src/lib.rs#L14042))
- Sample decoded payload: `{"topics":["proof_attested","SHIP-2026-001"],"data":[1,"abc123","G...EXAMPLE",1]}`

## `proof_corrected`

### Schema

- Topics: `(Symbol::new(&env, "proof_corrected"), shipment_id.clone())`
- Data shape: `(milestone_index, proof_hash_for_event)`
- Payload fields: `milestone_index`, `proof_hash_for_event`
- Emitting function(s): `correct_proof` ([lib.rs:9002](../contracts/stellarsettle/src/lib.rs#L9002))
- Sample decoded payload: `{"topics":["proof_corrected","SHIP-2026-001"],"data":[1,"abc123"]}`

## `proof_hash_length_bounds_set`

### Schema

- Topics: `(Symbol::new(&env, "proof_hash_length_bounds_set"),)`
- Data shape: `(min_len, max_len)`
- Payload fields: `min_len`, `max_len`
- Emitting function(s): `set_proof_hash_length_bounds` ([lib.rs:8613](../contracts/stellarsettle/src/lib.rs#L8613))
- Sample decoded payload: `{"topics":["proof_hash_length_bounds_set"],"data":[1,1]}`

## `proof_hash_required_prefix_set`

### Schema

- Topics: `(Symbol::new(&env, "proof_hash_required_prefix_set"),)`
- Data shape: `prefix`
- Payload fields: `prefix`
- Emitting function(s): `set_proof_hash_required_prefix` ([lib.rs:8644](../contracts/stellarsettle/src/lib.rs#L8644))
- Sample decoded payload: `{"topics":["proof_hash_required_prefix_set"],"data":"prefix"}`

## `proof_resubmitted`

### Schema

- Topics: `(event_topic, shipment_id.clone())`
- Data shape: `( milestone_index, proof_hash_for_event.clone(), proof_type, caller, current_ledger, )`
- Payload fields: `milestone_index`, `proof_hash_for_event`, `proof_type`, `caller`, `current_ledger`
- Emitting function(s): `submit_proof` ([lib.rs:8884](../contracts/stellarsettle/src/lib.rs#L8884))
- Sample decoded payload: `{"topics":["proof_resubmitted","SHIP-2026-001"],"data":[1,"abc123","proof_type","G...EXAMPLE",1]}`

## `proof_submitted`

### Schema 1

- Topics: `(event_topic, shipment_id.clone())`
- Data shape: `( milestone_index, proof_hash_for_event.clone(), proof_type, caller, current_ledger, )`
- Payload fields: `milestone_index`, `proof_hash_for_event`, `proof_type`, `caller`, `current_ledger`
- Emitting function(s): `submit_proof` ([lib.rs:8884](../contracts/stellarsettle/src/lib.rs#L8884))
- Sample decoded payload: `{"topics":["proof_submitted","SHIP-2026-001"],"data":[1,"abc123","proof_type","G...EXAMPLE",1]}`

### Schema 2

- Topics: `(Symbol::new(&env, "proof_submitted"), shipment_id.clone())`
- Data shape: `( milestone_index, proof_hash.clone(), proof_type, pending.first_attester.clone(), current_ledger, )`
- Payload fields: `milestone_index`, `proof_hash`, `proof_type`, `first_attester`, `current_ledger`
- Emitting function(s): `attest_proof` ([lib.rs:14046](../contracts/stellarsettle/src/lib.rs#L14046))
- Sample decoded payload: `{"topics":["proof_submitted","SHIP-2026-001"],"data":[1,"abc123","proof_type",1,1]}`

### Schema 3

- Topics: `( Symbol::new(env, "stellarsettle"), Symbol::new(env, "proof_submitted"), )`
- Data shape: `data`
- Payload fields: `data`
- Emitting function(s): `emit_milestone_proof_submitted`, `attest_proof`, `submit_proof` ([lib.rs:19686](../contracts/stellarsettle/src/lib.rs#L19686))
- Sample decoded payload: `{"topics":["stellarsettle","proof_submitted"],"data":{"shipment_id":"SHIP-2026-001","milestone_index":1,"proof_hash":"abc123","supplier":"G...EXAMPLE"}}`

## `proof_whitelist_set`

### Schema

- Topics: `( Symbol::new(&env, "proof_whitelist_set"), shipment_id.clone(), )`
- Data shape: `(milestone_index, buyer)`
- Payload fields: `milestone_index`, `buyer`
- Emitting function(s): `set_proof_whitelist` ([lib.rs:8444](../contracts/stellarsettle/src/lib.rs#L8444))
- Sample decoded payload: `{"topics":["proof_whitelist_set","SHIP-2026-001"],"data":[1,"G...EXAMPLE"]}`

## `rate_limit_exemption_added`

### Schema

- Topics: `(Symbol::new(&env, "rate_limit_exemption_added"), supplier)`
- Data shape: `()`
- Payload fields: unit
- Emitting function(s): `add_rate_limit_exemption` ([lib.rs:7993](../contracts/stellarsettle/src/lib.rs#L7993))
- Sample decoded payload: `{"topics":["rate_limit_exemption_added","G...EXAMPLE"],"data":null}`

## `rate_limit_exemption_removed`

### Schema

- Topics: `(Symbol::new(&env, "rate_limit_exemption_removed"), supplier)`
- Data shape: `()`
- Payload fields: unit
- Emitting function(s): `remove_rate_limit_exemption` ([lib.rs:8006](../contracts/stellarsettle/src/lib.rs#L8006))
- Sample decoded payload: `{"topics":["rate_limit_exemption_removed","G...EXAMPLE"],"data":null}`

## `rating_window_ledgers_set`

### Schema

- Topics: `(Symbol::new(&env, "rating_window_ledgers_set"),)`
- Data shape: `window_ledgers`
- Payload fields: `window_ledgers`
- Emitting function(s): `set_rating_window_ledgers` ([lib.rs:16938](../contracts/stellarsettle/src/lib.rs#L16938))
- Sample decoded payload: `{"topics":["rating_window_ledgers_set"],"data":1}`

## `recovery_cancelled`

### Schema

- Topics: `(Symbol::new(&env, "recovery_cancelled"), shipment_id.clone())`
- Data shape: `(admin, env.ledger().sequence())`
- Payload fields: `admin`, `ledger_sequence`
- Emitting function(s): `cancel_emergency_recover` ([lib.rs:16235](../contracts/stellarsettle/src/lib.rs#L16235))
- Sample decoded payload: `{"topics":["recovery_cancelled","SHIP-2026-001"],"data":["G...EXAMPLE",1]}`

## `recovery_delay_updated`

### Schema

- Topics: `(Symbol::new(&env, "recovery_delay_updated"),)`
- Data shape: `(admin, ledgers, env.ledger().sequence())`
- Payload fields: `admin`, `ledgers`, `ledger_sequence`
- Emitting function(s): `set_recovery_delay` ([lib.rs:16116](../contracts/stellarsettle/src/lib.rs#L16116))
- Sample decoded payload: `{"topics":["recovery_delay_updated"],"data":["G...EXAMPLE",1,1]}`

## `recovery_proposed`

### Schema

- Topics: `(Symbol::new(&env, "recovery_proposed"), shipment_id.clone())`
- Data shape: `(admin, effective_ledger, current_ledger)`
- Payload fields: `admin`, `effective_ledger`, `current_ledger`
- Emitting function(s): `propose_emergency_recover` ([lib.rs:16171](../contracts/stellarsettle/src/lib.rs#L16171))
- Sample decoded payload: `{"topics":["recovery_proposed","SHIP-2026-001"],"data":["G...EXAMPLE",1,1]}`

## `referral_fee_bps_set`

### Schema

- Topics: `(Symbol::new(&env, "referral_fee_bps_set"),)`
- Data shape: `bps`
- Payload fields: `bps`
- Emitting function(s): `set_referral_fee_bps` ([lib.rs:6017](../contracts/stellarsettle/src/lib.rs#L6017))
- Sample decoded payload: `{"topics":["referral_fee_bps_set"],"data":1}`

## `refund_recipient_set`

### Schema

- Topics: `(Symbol::new(&env, "refund_recipient_set"), shipment_id)`
- Data shape: `(buyer, recipient)`
- Payload fields: `buyer`, `recipient`
- Emitting function(s): `set_refund_recipient` ([lib.rs:4108](../contracts/stellarsettle/src/lib.rs#L4108))
- Sample decoded payload: `{"topics":["refund_recipient_set","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE"]}`

## `refund_sweep_window_set`

### Schema

- Topics: `(Symbol::new(&env, "refund_sweep_window_set"),)`
- Data shape: `ledgers`
- Payload fields: `ledgers`
- Emitting function(s): `set_refund_sweep_window` ([lib.rs:14462](../contracts/stellarsettle/src/lib.rs#L14462))
- Sample decoded payload: `{"topics":["refund_sweep_window_set"],"data":1}`

## `reputation_fast_track_set`

### Schema

- Topics: `(Symbol::new(&env, "reputation_fast_track_set"),)`
- Data shape: `(min_completed, max_disputed_ratio_bps)`
- Payload fields: `min_completed`, `max_disputed_ratio_bps`
- Emitting function(s): `set_reputation_fast_track` ([lib.rs:16272](../contracts/stellarsettle/src/lib.rs#L16272))
- Sample decoded payload: `{"topics":["reputation_fast_track_set"],"data":[1,1]}`

## `retainage_released`

### Schema

- Topics: `(Symbol::new(env, "retainage_released"), shipment_id.clone())`
- Data shape: `(shipment.supplier.clone(), retainage)`
- Payload fields: `supplier`, `retainage`
- Emitting function(s): `settle_on_completion` ([lib.rs:21492](../contracts/stellarsettle/src/lib.rs#L21492))
- Sample decoded payload: `{"topics":["retainage_released","SHIP-2026-001"],"data":["G...EXAMPLE",1]}`

## `role_granted`

### Schema

- Topics: `(Symbol::new(&env, "role_granted"), admin)`
- Data shape: `(role, address)`
- Payload fields: `role`, `address`
- Emitting function(s): `grant_role` ([lib.rs:2138](../contracts/stellarsettle/src/lib.rs#L2138))
- Sample decoded payload: `{"topics":["role_granted","G...EXAMPLE"],"data":[1,"G...EXAMPLE"]}`

## `role_revoked`

### Schema

- Topics: `(Symbol::new(&env, "role_revoked"), admin)`
- Data shape: `(role, address)`
- Payload fields: `role`, `address`
- Emitting function(s): `revoke_role` ([lib.rs:2155](../contracts/stellarsettle/src/lib.rs#L2155))
- Sample decoded payload: `{"topics":["role_revoked","G...EXAMPLE"],"data":[1,"G...EXAMPLE"]}`

## `shipment_archived`

### Schema

- Topics: `(Symbol::new(&env, "shipment_archived"), shipment_id)`
- Data shape: `(archived.status, archived.completed_at)`
- Payload fields: `status`, `completed_at`
- Emitting function(s): `archive_shipment` ([lib.rs:16729](../contracts/stellarsettle/src/lib.rs#L16729))
- Sample decoded payload: `{"topics":["shipment_archived","SHIP-2026-001"],"data":[1,1]}`

## `shipment_cancelled`

### Schema 1

- Topics: `( Symbol::new(&env, "shipment_cancelled"), shipment_id.clone(), )`
- Data shape: `(unreleased, 0i128, buyer.clone(), env.ledger().sequence())`
- Payload fields: `unreleased`, `i128`, `buyer`, `ledger_sequence`
- Emitting function(s): `cancel_for_blacklisted_supplier` ([lib.rs:4206](../contracts/stellarsettle/src/lib.rs#L4206))
- Sample decoded payload: `{"topics":["shipment_cancelled","SHIP-2026-001"],"data":[1,1,"G...EXAMPLE",1]}`

### Schema 2

- Topics: `(Symbol::new(env, "shipment_cancelled"), shipment_id.clone())`
- Data shape: `(refund, cancel_fee, buyer.clone(), env.ledger().sequence())`
- Payload fields: `refund`, `cancel_fee`, `buyer`, `ledger_sequence`
- Emitting function(s): `cancel_shipment_internal` ([lib.rs:11958](../contracts/stellarsettle/src/lib.rs#L11958))
- Sample decoded payload: `{"topics":["shipment_cancelled","SHIP-2026-001"],"data":[1,1,"G...EXAMPLE",1]}`

### Schema 3

- Topics: `( Symbol::new(env, "stellarsettle"), Symbol::new(env, "shipment_cancelled"), )`
- Data shape: `data`
- Payload fields: `data`
- Emitting function(s): `emit_shipment_cancelled`, `cancel_for_blacklisted_supplier`, `cancel_shipment_internal`, `claim_deadline_refund`, `do_emergency_recover`, `supplier_cancel`, `sweep_unclaimed_refund` ([lib.rs:19791](../contracts/stellarsettle/src/lib.rs#L19791))
- Sample decoded payload: `{"topics":["stellarsettle","shipment_cancelled"],"data":{"shipment_id":"SHIP-2026-001","refund_amount":1,"reason":"reason"}}`

## `shipment_completed`

### Schema

- Topics: `( Symbol::new(env, "stellarsettle"), Symbol::new(env, "shipment_completed"), )`
- Data shape: `data`
- Payload fields: `data`
- Emitting function(s): `emit_shipment_completed`, `settle_on_completion` ([lib.rs:19804](../contracts/stellarsettle/src/lib.rs#L19804))
- Sample decoded payload: `{"topics":["stellarsettle","shipment_completed"],"data":{"shipment_id":"SHIP-2026-001","total_paid":1}}`

## `shipment_created`

### Schema 1

- Topics: `(Symbol::new(&env, "shipment_created"), shipment_id.clone())`
- Data shape: `( shipment.buyers.get(0).unwrap(), shipment.supplier.clone(), shipment.logistics.clone(), shipment.arbiter.clone(), shipment.token.clone(), shipment.total_amount, env.ledger().sequence(), shipment.metadata_hash.clone(), )`
- Payload fields: `value_1`, `supplier`, `logistics`, `arbiter`, `token`, `total_amount`, `ledger_sequence`, `metadata_hash`
- Emitting function(s): `create_shipment` ([lib.rs:7734](../contracts/stellarsettle/src/lib.rs#L7734))
- Sample decoded payload: `{"topics":["shipment_created","SHIP-2026-001"],"data":[1,"G...EXAMPLE",1,"G...EXAMPLE","G...EXAMPLE",1,1,"abc123"]}`

### Schema 2

- Topics: `( Symbol::new(env, "stellarsettle"), Symbol::new(env, "shipment_created"), )`
- Data shape: `data`
- Payload fields: `data`
- Emitting function(s): `emit_shipment_created`, `create_shipment` ([lib.rs:19662](../contracts/stellarsettle/src/lib.rs#L19662))
- Sample decoded payload: `{"topics":["stellarsettle","shipment_created"],"data":{"shipment_id":"SHIP-2026-001","buyer":"G...EXAMPLE","supplier":"G...EXAMPLE","arbiter":"G...EXAMPLE","token":"G...EXAMPLE","amount":1}}`

## `shipment_fee_override_cleared`

### Schema

- Topics: `(Symbol::new(&env, "shipment_fee_override_cleared"),)`
- Data shape: `shipment_id`
- Payload fields: `shipment_id`
- Emitting function(s): `clear_shipment_fee_override` ([lib.rs:14821](../contracts/stellarsettle/src/lib.rs#L14821))
- Sample decoded payload: `{"topics":["shipment_fee_override_cleared"],"data":"SHIP-2026-001"}`

## `shipment_fee_override_set`

### Schema

- Topics: `(Symbol::new(&env, "shipment_fee_override_set"), shipment_id)`
- Data shape: `fee_bps`
- Payload fields: `fee_bps`
- Emitting function(s): `set_shipment_fee_override` ([lib.rs:14809](../contracts/stellarsettle/src/lib.rs#L14809))
- Sample decoded payload: `{"topics":["shipment_fee_override_set","SHIP-2026-001"],"data":1}`

## `shipment_metadata_set`

### Schema

- Topics: `(Symbol::new(&env, "shipment_metadata_set"), shipment_id)`
- Data shape: `(caller, key, value)`
- Payload fields: `caller`, `key`, `value`
- Emitting function(s): `set_shipment_metadata` ([lib.rs:16627](../contracts/stellarsettle/src/lib.rs#L16627))
- Sample decoded payload: `{"topics":["shipment_metadata_set","SHIP-2026-001"],"data":["G...EXAMPLE","key",1]}`

## `shipment_oracle_purpose_set`

### Schema

- Topics: `(Symbol::new(&env, "shipment_oracle_purpose_set"), shipment_id)`
- Data shape: `purpose`
- Payload fields: `purpose`
- Emitting function(s): `set_shipment_oracle_purpose` ([lib.rs:13723](../contracts/stellarsettle/src/lib.rs#L13723))
- Sample decoded payload: `{"topics":["shipment_oracle_purpose_set","SHIP-2026-001"],"data":"purpose"}`

## `shipment_pause_requested`

### Schema

- Topics: `(Symbol::new(&env, "shipment_pause_requested"), shipment_id)`
- Data shape: `caller`
- Payload fields: `caller`
- Emitting function(s): `request_shipment_pause` ([lib.rs:16356](../contracts/stellarsettle/src/lib.rs#L16356))
- Sample decoded payload: `{"topics":["shipment_pause_requested","SHIP-2026-001"],"data":"G...EXAMPLE"}`

## `shipment_paused`

### Schema

- Topics: `(Symbol::new(&env, "shipment_paused"), shipment_id)`
- Data shape: `(caller, now)`
- Payload fields: `caller`, `now`
- Emitting function(s): `approve_shipment_pause` ([lib.rs:16395](../contracts/stellarsettle/src/lib.rs#L16395))
- Sample decoded payload: `{"topics":["shipment_paused","SHIP-2026-001"],"data":["G...EXAMPLE",1]}`

## `shipment_rate_limit_set`

### Schema

- Topics: `(Symbol::new(&env, "shipment_rate_limit_set"),)`
- Data shape: `(max_shipments, window_ledgers)`
- Payload fields: `max_shipments`, `window_ledgers`
- Emitting function(s): `set_shipment_creation_rate_limit` ([lib.rs:7968](../contracts/stellarsettle/src/lib.rs#L7968))
- Sample decoded payload: `{"topics":["shipment_rate_limit_set"],"data":[1,1]}`

## `shipment_resume_requested`

### Schema

- Topics: `(Symbol::new(&env, "shipment_resume_requested"), shipment_id)`
- Data shape: `caller`
- Payload fields: `caller`
- Emitting function(s): `resume_shipment` ([lib.rs:16452](../contracts/stellarsettle/src/lib.rs#L16452))
- Sample decoded payload: `{"topics":["shipment_resume_requested","SHIP-2026-001"],"data":"G...EXAMPLE"}`

## `shipment_resumed`

### Schema

- Topics: `(Symbol::new(&env, "shipment_resumed"), shipment_id)`
- Data shape: `(caller, env.ledger().sequence())`
- Payload fields: `caller`, `ledger_sequence`
- Emitting function(s): `resume_shipment` ([lib.rs:16436](../contracts/stellarsettle/src/lib.rs#L16436))
- Sample decoded payload: `{"topics":["shipment_resumed","SHIP-2026-001"],"data":["G...EXAMPLE",1]}`

## `shipment_ttl_extended`

### Schema

- Topics: `(Symbol::new(&env, "shipment_ttl_extended"), shipment_id)`
- Data shape: `constants::TTL_MAX_LEDGERS`
- Payload fields: `TTL_MAX_LEDGERS`
- Emitting function(s): `extend_shipment_ttl` ([lib.rs:16780](../contracts/stellarsettle/src/lib.rs#L16780))
- Sample decoded payload: `{"topics":["shipment_ttl_extended","SHIP-2026-001"],"data":1}`

## `standing_order_cancelled`

### Schema

- Topics: `(Symbol::new(&env, "standing_order_cancelled"), order_id)`
- Data shape: `(buyer, env.ledger().sequence())`
- Payload fields: `buyer`, `ledger_sequence`
- Emitting function(s): `cancel_standing_order` ([lib.rs:3693](../contracts/stellarsettle/src/lib.rs#L3693))
- Sample decoded payload: `{"topics":["standing_order_cancelled",1],"data":["G...EXAMPLE",1]}`

## `standing_order_created`

### Schema

- Topics: `(Symbol::new(&env, "standing_order_created"), order_id)`
- Data shape: `( buyer, params.template_name, params.amount, params.interval_ledgers, params.max_occurrences, )`
- Payload fields: `buyer`, `template_name`, `amount`, `interval_ledgers`, `max_occurrences`
- Emitting function(s): `create_standing_order` ([lib.rs:3592](../contracts/stellarsettle/src/lib.rs#L3592))
- Sample decoded payload: `{"topics":["standing_order_created",1],"data":["G...EXAMPLE","template_name",1,1,1]}`

## `standing_order_executed`

### Schema

- Topics: `(Symbol::new(&env, "standing_order_executed"), order_id)`
- Data shape: `(created.clone(), order.occurrences, order.next_ledger)`
- Payload fields: `created`, `occurrences`, `next_ledger`
- Emitting function(s): `execute_standing_order` ([lib.rs:3664](../contracts/stellarsettle/src/lib.rs#L3664))
- Sample decoded payload: `{"topics":["standing_order_executed",1],"data":[1,1,1]}`

## `substitute_approved`

### Schema

- Topics: `(Symbol::new(&env, "substitute_approved"), shipment_id.clone())`
- Data shape: `(milestone_index, new_supplier.clone(), arbiter)`
- Payload fields: `milestone_index`, `new_supplier`, `arbiter`
- Emitting function(s): `approve_substitute_supplier` ([lib.rs:15121](../contracts/stellarsettle/src/lib.rs#L15121))
- Sample decoded payload: `{"topics":["substitute_approved","SHIP-2026-001"],"data":[1,"G...EXAMPLE","G...EXAMPLE"]}`

## `substitute_proposed`

### Schema

- Topics: `(Symbol::new(&env, "substitute_proposed"), shipment_id)`
- Data shape: `(milestone_index, new_supplier, buyer)`
- Payload fields: `milestone_index`, `new_supplier`, `buyer`
- Emitting function(s): `propose_substitute_supplier` ([lib.rs:15055](../contracts/stellarsettle/src/lib.rs#L15055))
- Sample decoded payload: `{"topics":["substitute_proposed","SHIP-2026-001"],"data":[1,"G...EXAMPLE","G...EXAMPLE"]}`

## `supplier_cancel_cooldown_set`

### Schema

- Topics: `(Symbol::new(&env, "supplier_cancel_cooldown_set"), supplier)`
- Data shape: `(max_cancellations, window_ledgers, cooldown_ledgers)`
- Payload fields: `max_cancellations`, `window_ledgers`, `cooldown_ledgers`
- Emitting function(s): `set_supplier_cancel_cooldown` ([lib.rs:8092](../contracts/stellarsettle/src/lib.rs#L8092))
- Sample decoded payload: `{"topics":["supplier_cancel_cooldown_set","G...EXAMPLE"],"data":[1,1,1]}`

## `supplier_cancellation`

### Schema

- Topics: `( Symbol::new(&env, "supplier_cancellation"), shipment_id.clone(), )`
- Data shape: `(penalty, refund)`
- Payload fields: `penalty`, `refund`
- Emitting function(s): `supplier_cancel` ([lib.rs:12106](../contracts/stellarsettle/src/lib.rs#L12106))
- Sample decoded payload: `{"topics":["supplier_cancellation","SHIP-2026-001"],"data":[1,1]}`

## `supplier_exposure_cap_set`

### Schema

- Topics: `(Symbol::new(&env, "supplier_exposure_cap_set"),)`
- Data shape: `cap`
- Payload fields: `cap`
- Emitting function(s): `set_supplier_exposure_cap` ([lib.rs:15969](../contracts/stellarsettle/src/lib.rs#L15969))
- Sample decoded payload: `{"topics":["supplier_exposure_cap_set"],"data":1}`

## `supplier_substituted`

### Schema

- Topics: `(Symbol::new(&env, "supplier_substituted"), shipment_id)`
- Data shape: `(milestone_index, new_supplier)`
- Payload fields: `milestone_index`, `new_supplier`
- Emitting function(s): `approve_substitute_supplier` ([lib.rs:15125](../contracts/stellarsettle/src/lib.rs#L15125))
- Sample decoded payload: `{"topics":["supplier_substituted","SHIP-2026-001"],"data":[1,"G...EXAMPLE"]}`

## `supplier_tier_changed`

### Schema

- Topics: `(Symbol::new(env, "supplier_tier_changed"), supplier.clone())`
- Data shape: `(supplier.clone(), old_tier, new_tier)`
- Payload fields: `supplier`, `old_tier`, `new_tier`
- Emitting function(s): `evaluate_supplier_tier_change` ([lib.rs:3039](../contracts/stellarsettle/src/lib.rs#L3039))
- Sample decoded payload: `{"topics":["supplier_tier_changed","G...EXAMPLE"],"data":["G...EXAMPLE","old_tier","new_tier"]}`

## `supplier_tier_config_set`

### Schema

- Topics: `(Symbol::new(&env, "supplier_tier_config_set"),)`
- Data shape: `()`
- Payload fields: unit
- Emitting function(s): `set_supplier_tier_config` ([lib.rs:2961](../contracts/stellarsettle/src/lib.rs#L2961))
- Sample decoded payload: `{"topics":["supplier_tier_config_set"],"data":null}`

## `supplier_transferred`

### Schema

- Topics: `( Symbol::new(&env, "supplier_transferred"), shipment_id.clone(), )`
- Data shape: `(current_supplier, new_supplier)`
- Payload fields: `current_supplier`, `new_supplier`
- Emitting function(s): `transfer_supplier` ([lib.rs:12365](../contracts/stellarsettle/src/lib.rs#L12365))
- Sample decoded payload: `{"topics":["supplier_transferred","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE"]}`

## `supplier_unwhitelisted`

### Schema

- Topics: `(Symbol::new(&env, "supplier_unwhitelisted"),)`
- Data shape: `address`
- Payload fields: `address`
- Emitting function(s): `remove_from_whitelist` ([lib.rs:5890](../contracts/stellarsettle/src/lib.rs#L5890))
- Sample decoded payload: `{"topics":["supplier_unwhitelisted"],"data":"G...EXAMPLE"}`

## `supplier_whitelisted`

### Schema

- Topics: `(Symbol::new(&env, "supplier_whitelisted"),)`
- Data shape: `address`
- Payload fields: `address`
- Emitting function(s): `add_to_whitelist` ([lib.rs:5867](../contracts/stellarsettle/src/lib.rs#L5867))
- Sample decoded payload: `{"topics":["supplier_whitelisted"],"data":"G...EXAMPLE"}`

## `timelock_duration_set`

### Schema

- Topics: `(Symbol::new(&env, "timelock_duration_set"),)`
- Data shape: `ledgers`
- Payload fields: `ledgers`
- Emitting function(s): `set_timelock_duration` ([lib.rs:15384](../contracts/stellarsettle/src/lib.rs#L15384))
- Sample decoded payload: `{"topics":["timelock_duration_set"],"data":1}`

## `token_max_shipment_value_cleared`

### Schema

- Topics: `(Symbol::new(&env, "token_max_shipment_value_cleared"),)`
- Data shape: `token`
- Payload fields: `token`
- Emitting function(s): `clear_token_max_shipment_value` ([lib.rs:19931](../contracts/stellarsettle/src/lib.rs#L19931))
- Sample decoded payload: `{"topics":["token_max_shipment_value_cleared"],"data":"G...EXAMPLE"}`

## `token_max_shipment_value_set`

### Schema

- Topics: `(Symbol::new(&env, "token_max_shipment_value_set"), token)`
- Data shape: `max_value`
- Payload fields: `max_value`
- Emitting function(s): `set_token_max_shipment_value` ([lib.rs:19916](../contracts/stellarsettle/src/lib.rs#L19916))
- Sample decoded payload: `{"topics":["token_max_shipment_value_set","G...EXAMPLE"],"data":1}`

## `token_min_shipment_value_cleared`

### Schema

- Topics: `(Symbol::new(&env, "token_min_shipment_value_cleared"),)`
- Data shape: `token`
- Payload fields: `token`
- Emitting function(s): `clear_token_min_shipment_value` ([lib.rs:19896](../contracts/stellarsettle/src/lib.rs#L19896))
- Sample decoded payload: `{"topics":["token_min_shipment_value_cleared"],"data":"G...EXAMPLE"}`

## `token_min_shipment_value_set`

### Schema

- Topics: `(Symbol::new(&env, "token_min_shipment_value_set"), token)`
- Data shape: `min_amount`
- Payload fields: `min_amount`
- Emitting function(s): `set_token_min_shipment_value` ([lib.rs:19881](../contracts/stellarsettle/src/lib.rs#L19881))
- Sample decoded payload: `{"topics":["token_min_shipment_value_set","G...EXAMPLE"],"data":1}`

## `treasury_withdrawal`

### Schema

- Topics: `(Symbol::new(&env, "treasury_withdrawal"), token)`
- Data shape: `(to, dust_amount, env.ledger().sequence())`
- Payload fields: `to`, `dust_amount`, `ledger_sequence`
- Emitting function(s): `withdraw_treasury_dust` ([lib.rs:3326](../contracts/stellarsettle/src/lib.rs#L3326))
- Sample decoded payload: `{"topics":["treasury_withdrawal","G...EXAMPLE"],"data":[1,1,1]}`

## `tvl_cap_set`

### Schema

- Topics: `(Symbol::new(&env, "tvl_cap_set"), token)`
- Data shape: `cap`
- Payload fields: `cap`
- Emitting function(s): `set_tvl_cap` ([lib.rs:15271](../contracts/stellarsettle/src/lib.rs#L15271))
- Sample decoded payload: `{"topics":["tvl_cap_set","G...EXAMPLE"],"data":1}`

## `unclaimed_refund_swept`

### Schema

- Topics: `(Symbol::new(&env, "unclaimed_refund_swept"), shipment_id.clone())`
- Data shape: `(milestone_index, refund_amount, fee_config.treasury)`
- Payload fields: `milestone_index`, `refund_amount`, `treasury`
- Emitting function(s): `sweep_unclaimed_refund` ([lib.rs:14653](../contracts/stellarsettle/src/lib.rs#L14653))
- Sample decoded payload: `{"topics":["unclaimed_refund_swept","SHIP-2026-001"],"data":[1,1,1]}`

## `upgrade_approved`

### Schema

- Topics: `(Symbol::new(&env, "upgrade_approved"), proposal_id)`
- Data shape: `(admin, approvals_count)`
- Payload fields: `admin`, `approvals_count`
- Emitting function(s): `approve_upgrade` ([lib.rs:2052](../contracts/stellarsettle/src/lib.rs#L2052))
- Sample decoded payload: `{"topics":["upgrade_approved",1],"data":["G...EXAMPLE",1]}`

## `upgrade_cancelled`

### Schema

- Topics: `(Symbol::new(&env, "upgrade_cancelled"), proposal_id)`
- Data shape: `admin`
- Payload fields: `admin`
- Emitting function(s): `cancel_upgrade` ([lib.rs:2075](../contracts/stellarsettle/src/lib.rs#L2075))
- Sample decoded payload: `{"topics":["upgrade_cancelled",1],"data":"G...EXAMPLE"}`

## `upgrade_executed`

### Schema

- Topics: `(Symbol::new(env, "upgrade_executed"), proposal_id)`
- Data shape: `proposal.new_wasm_hash`
- Payload fields: `new_wasm_hash`
- Emitting function(s): `execute_upgrade_proposal` ([lib.rs:2112](../contracts/stellarsettle/src/lib.rs#L2112))
- Sample decoded payload: `{"topics":["upgrade_executed",1],"data":"abc123"}`

## `upgrade_proposed`

### Schema

- Topics: `(Symbol::new(&env, "upgrade_proposed"), proposal_id)`
- Data shape: `(new_wasm_hash, admin, 1u32)`
- Payload fields: `new_wasm_hash`, `admin`, `u32`
- Emitting function(s): `propose_upgrade` ([lib.rs:2016](../contracts/stellarsettle/src/lib.rs#L2016))
- Sample decoded payload: `{"topics":["upgrade_proposed",1],"data":["abc123","G...EXAMPLE",1]}`

## `vault_deposited`

### Schema

- Topics: `(Symbol::new(&env, "vault_deposited"), buyer.clone(), token)`
- Data shape: `(amount, env.ledger().sequence())`
- Payload fields: `amount`, `ledger_sequence`
- Emitting function(s): `vault_deposit` ([lib.rs:3360](../contracts/stellarsettle/src/lib.rs#L3360))
- Sample decoded payload: `{"topics":["vault_deposited","G...EXAMPLE","G...EXAMPLE"],"data":[1,1]}`

## `vault_withdrawn`

### Schema

- Topics: `(Symbol::new(&env, "vault_withdrawn"), buyer.clone(), token)`
- Data shape: `(amount, env.ledger().sequence())`
- Payload fields: `amount`, `ledger_sequence`
- Emitting function(s): `vault_withdraw` ([lib.rs:3393](../contracts/stellarsettle/src/lib.rs#L3393))
- Sample decoded payload: `{"topics":["vault_withdrawn","G...EXAMPLE","G...EXAMPLE"],"data":[1,1]}`

## `warning_lead_ledgers_set`

### Schema

- Topics: `(Symbol::new(&env, "warning_lead_ledgers_set"),)`
- Data shape: `ledgers`
- Payload fields: `ledgers`
- Emitting function(s): `set_warning_lead_ledgers` ([lib.rs:2743](../contracts/stellarsettle/src/lib.rs#L2743))
- Sample decoded payload: `{"topics":["warning_lead_ledgers_set"],"data":1}`

## `warranty_claim_filed`

### Schema

- Topics: `(Symbol::new(&env, "warranty_claim_filed"), shipment_id)`
- Data shape: `(buyer, shipment.arbiter.clone(), evidence_hash)`
- Payload fields: `buyer`, `arbiter`, `evidence_hash`
- Emitting function(s): `file_warranty_claim` ([lib.rs:20724](../contracts/stellarsettle/src/lib.rs#L20724))
- Sample decoded payload: `{"topics":["warranty_claim_filed","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE","abc123"]}`

## `warranty_claim_resolved`

### Schema

- Topics: `(Symbol::new(&env, "warranty_claim_resolved"), shipment_id)`
- Data shape: `(arbiter, refund_buyer, refunded)`
- Payload fields: `arbiter`, `refund_buyer`, `refunded`
- Emitting function(s): `resolve_warranty_claim` ([lib.rs:20781](../contracts/stellarsettle/src/lib.rs#L20781))
- Sample decoded payload: `{"topics":["warranty_claim_resolved","SHIP-2026-001"],"data":["G...EXAMPLE","G...EXAMPLE",1]}`

## `warranty_released`

### Schema

- Topics: `(Symbol::new(&env, "warranty_released"), shipment_id)`
- Data shape: `(shipment.supplier.clone(), amount)`
- Payload fields: `supplier`, `amount`
- Emitting function(s): `release_warranty` ([lib.rs:20834](../contracts/stellarsettle/src/lib.rs#L20834))
- Sample decoded payload: `{"topics":["warranty_released","SHIP-2026-001"],"data":["G...EXAMPLE",1]}`

## `warranty_started`

### Schema

- Topics: `(Symbol::new(env, "warranty_started"), shipment_id.clone())`
- Data shape: `(warranty, ends_at)`
- Payload fields: `warranty`, `ends_at`
- Emitting function(s): `settle_on_completion` ([lib.rs:21515](../contracts/stellarsettle/src/lib.rs#L21515))
- Sample decoded payload: `{"topics":["warranty_started","SHIP-2026-001"],"data":[1,1]}`

## `webhook_added`

### Schema

- Topics: `(Symbol::new(&env, "webhook_added"),)`
- Data shape: `(admin, contract_address, env.ledger().sequence())`
- Payload fields: `admin`, `contract_address`, `ledger_sequence`
- Emitting function(s): `add_confirmation_webhook` ([lib.rs:5444](../contracts/stellarsettle/src/lib.rs#L5444))
- Sample decoded payload: `{"topics":["webhook_added"],"data":["G...EXAMPLE","G...EXAMPLE",1]}`

## `webhook_removed`

### Schema

- Topics: `(Symbol::new(&env, "webhook_removed"),)`
- Data shape: `(admin, contract_address, env.ledger().sequence())`
- Payload fields: `admin`, `contract_address`, `ledger_sequence`
- Emitting function(s): `remove_confirmation_webhook` ([lib.rs:5475](../contracts/stellarsettle/src/lib.rs#L5475))
- Sample decoded payload: `{"topics":["webhook_removed"],"data":["G...EXAMPLE","G...EXAMPLE",1]}`
