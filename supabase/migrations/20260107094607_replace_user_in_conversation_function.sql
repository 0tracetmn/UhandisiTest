/*
  # Replace user_in_conversation Function with PL/pgSQL Version

  1. Changes
    - Replace SQL function with PL/pgSQL version
    - Ensures proper execution context for bypassing RLS

  2. Security
    - SECURITY DEFINER ensures function runs with elevated privileges
    - Bypasses RLS to prevent infinite recursion
*/

-- Replace function (doesn't require dropping since using CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION user_in_conversation(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM chat_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  );
END;
$$;

COMMENT ON FUNCTION user_in_conversation IS 
'Checks if a user is a participant in a conversation. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
