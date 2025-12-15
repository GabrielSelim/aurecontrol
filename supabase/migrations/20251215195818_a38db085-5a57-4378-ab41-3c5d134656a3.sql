-- Function to handle new user signup with company creation
CREATE OR REPLACE FUNCTION public.handle_new_user_signup(
  _user_id uuid,
  _email text,
  _full_name text,
  _cpf text,
  _phone text,
  _company_name text,
  _cnpj text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
  _profile_id uuid;
BEGIN
  -- Create the company
  INSERT INTO public.companies (name, cnpj, email)
  VALUES (_company_name, _cnpj, _email)
  RETURNING id INTO _company_id;
  
  -- Create the profile
  INSERT INTO public.profiles (user_id, email, full_name, cpf, phone, company_id)
  VALUES (_user_id, _email, _full_name, _cpf, _phone, _company_id)
  RETURNING id INTO _profile_id;
  
  -- Assign admin role to the user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin');
  
  RETURN json_build_object(
    'company_id', _company_id,
    'profile_id', _profile_id
  );
END;
$$;

-- Function to handle invited user signup (without company creation)
CREATE OR REPLACE FUNCTION public.handle_invited_user_signup(
  _user_id uuid,
  _email text,
  _full_name text,
  _cpf text,
  _phone text,
  _invite_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite record;
  _profile_id uuid;
BEGIN
  -- Get and validate the invite
  SELECT * INTO _invite
  FROM public.invites
  WHERE token = _invite_token
    AND email = _email
    AND status = 'pending'
    AND expires_at > now();
    
  IF _invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;
  
  -- Create the profile
  INSERT INTO public.profiles (user_id, email, full_name, cpf, phone, company_id)
  VALUES (_user_id, _email, _full_name, _cpf, _phone, _invite.company_id)
  RETURNING id INTO _profile_id;
  
  -- Assign the invited role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _invite.role);
  
  -- Mark invite as accepted
  UPDATE public.invites
  SET status = 'accepted', accepted_at = now()
  WHERE id = _invite.id;
  
  RETURN json_build_object(
    'profile_id', _profile_id,
    'company_id', _invite.company_id,
    'role', _invite.role
  );
END;
$$;