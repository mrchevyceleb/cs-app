-- Add follow_up_count to support graduated follow-up stages
-- Stage 0: no follow-ups sent yet (initial follow_up_at is set by trigger)
-- Stage 1: first follow-up sent, next follow-up in 48h
-- Stage 2: second follow-up sent, next follow-up in 48h
-- Stage 3: third (final) follow-up sent, auto_close_at set to 24h

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS follow_up_count smallint NOT NULL DEFAULT 0;

-- Update lifecycle trigger to NOT set auto_close_at on creation
-- (auto_close_at will be set after the 3rd follow-up instead)
CREATE OR REPLACE FUNCTION set_ticket_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  v_intervals RECORD;
BEGIN
  SELECT * INTO v_intervals FROM get_lifecycle_intervals(NEW.priority);
  NEW.follow_up_at := NEW.created_at + v_intervals.follow_up_interval;
  -- Don't set auto_close_at on creation; it gets set after 3rd follow-up
  NEW.auto_close_at := NULL;
  NEW.follow_up_count := 0;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reset follow_up_count when customer replies (conversation is active again)
CREATE OR REPLACE FUNCTION reset_follow_up_on_message()
RETURNS TRIGGER AS $$
DECLARE
  v_intervals RECORD;
  v_priority text;
BEGIN
  IF NEW.sender_type = 'customer' THEN
    SELECT priority INTO v_priority
    FROM tickets
    WHERE id = NEW.ticket_id;

    SELECT * INTO v_intervals
    FROM get_lifecycle_intervals(v_priority);

    UPDATE tickets
    SET follow_up_at = now() + v_intervals.follow_up_interval,
        auto_close_at = NULL,
        follow_up_count = 0
    WHERE id = NEW.ticket_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Skip post-resolve auto_close_at for tickets that completed graduated follow-ups
-- (they were already auto-closed by the cron, no need for a post-resolve window)
CREATE OR REPLACE FUNCTION set_post_resolve_close()
RETURNS TRIGGER AS $$
DECLARE
  v_intervals RECORD;
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' AND COALESCE(NEW.follow_up_count, 0) < 3 THEN
    SELECT * INTO v_intervals
    FROM get_lifecycle_intervals(NEW.priority);

    NEW.auto_close_at := now() + v_intervals.post_resolve_close_interval;
    NEW.follow_up_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
