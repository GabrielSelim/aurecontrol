-- Create function to handle master admin signup (no company required)
CREATE OR REPLACE FUNCTION public.handle_master_admin_signup(
  _user_id uuid, 
  _email text, 
  _full_name text, 
  _cpf text, 
  _phone text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile_id uuid;
BEGIN
  -- Create the profile without company
  INSERT INTO public.profiles (user_id, email, full_name, cpf, phone, company_id)
  VALUES (_user_id, _email, _full_name, _cpf, _phone, NULL)
  RETURNING id INTO _profile_id;
  
  -- Assign master_admin role to the user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'master_admin');
  
  RETURN json_build_object(
    'profile_id', _profile_id
  );
END;
$$;