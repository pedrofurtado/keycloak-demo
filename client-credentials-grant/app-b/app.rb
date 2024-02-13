# app_b.rb
require 'sinatra'
require 'sinatra/reloader'
require 'net/http'
require 'uri'
require 'jwt'

configure do
  enable :reloader
  set :client_id, 'backend-app-b'
  set :client_secret, 'oHFwjEE3EgWuxKarXmLEHAhhRWAI41P5'
  set :realm, 'my-company'
  set :auth_server_url, 'https://4f43-177-33-138-202.ngrok-free.app'
  set :required_role, 'full-access-in-api'
  set :expected_audience, 'backend-app-b'
end

def validate_token(token)
  begin
    # Decodifica o token JWT
    decoded_token = JWT.decode(token, nil, false)

    # Verifica a assinatura do JWT
    jwks_uri = URI("#{settings.auth_server_url}/realms/#{settings.realm}/protocol/openid-connect/certs")
    jwks_response = Net::HTTP.get(jwks_uri)
    jwks = JSON.parse(jwks_response)

    expected_iss = "#{settings.auth_server_url}/realms/#{settings.realm}"
    expected_algorithm = 'RS256'

    options = {
      jwks: jwks,
      algorithm: expected_algorithm,
      iss: expected_iss,
      aud: settings.expected_audience,
      verify_aud: true,
      verify_expiration: true,
      verify_iat: true,
      verify_iss: true,
      verify_jti: true,
      verify_not_before: true
    }

    payload, _header = JWT.decode(token, nil, true, options)

    # Verifica se o token tem a role específica
    roles = payload['resource_access'][settings.client_id]['roles'] rescue []
    if !roles.include?(settings.required_role)
      return false, "Token does not have the specific role #{settings.required_role} | Roles of #{payload['azp']}: #{roles}"
    end

    return true, 'Token is valid and has access/role'
  rescue => e
    return false, "Token is invalid #{e}"
  end
end

get '/validate_token' do
  token = request.env['HTTP_AUTHORIZATION']&.split('Bearer ')&.last

  if token
    valid, message = validate_token(token)
    if valid
      "OK: #{message}"
    else
      "ERR: #{message}"
    end
  else
    'No token provided'
  end
end
