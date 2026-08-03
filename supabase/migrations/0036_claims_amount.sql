-- Claims — add an explicit Amount field captured at submission time,
-- separate from the itemized expense_lines total (which is filled in
-- afterward, per the original spec's flow). Both can coexist: this is
-- the claimant's expected/declared amount, expense lines are the
-- itemized breakdown added later.

alter table claims add column if not exists amount numeric(10,2);
