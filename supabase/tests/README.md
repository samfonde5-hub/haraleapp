# RLS security tests

`rls_foundation.sql` simulates 4 users (Patient A, Patient B, Staff, Doctor) + anonymous, and checks that
each can only see/change what the PRD allows. Run it after every migration (Supabase SQL editor or MCP),
then run the cleanup block at the bottom.

Last run: 14 Nov 2026 — foundation 18/18 PASS, phase 2 13/13 PASS (self-rollback pattern: test ends with RAISE so nothing persists).
