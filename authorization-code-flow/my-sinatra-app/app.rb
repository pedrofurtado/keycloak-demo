require 'sinatra'
require 'sinatra/reloader'
require 'net/http'
require 'uri'
require 'jwt'
require 'securerandom'
require 'date'
require 'redis-store'
require 'rack'
require 'redis-rack'

configure do
  enable :reloader
end

use Rack::Session::Redis, redis_server: 'redis://sessions_sinatra:6379/0'

MY_SINATRA_APP_CONFIG = OpenStruct.new(
  realm: 'my-company',
  keycloak_public_url: 'https://4f43-177-33-138-202.ngrok-free.app', # run ngrok http 8080. You MUST go to page 'http://localhost:8080/admin/master/console/#/my-company/realm-settings', in field 'Frontend URL' and put the ngrok URL to make work the refresh token endpoint.
  keycloak_docker_internal_url: 'https://4f43-177-33-138-202.ngrok-free.app',
  my_sinatra_app_base_url: 'http://localhost:3006',
  client_id: 'my-sinatra-app',
  client_secret: 'DAq1AXRkVvPXZh8ogcVXJ8ifnTYWFGlW'
)

def verify_user_is_logged_in!
  redirect('/login') if !user_is_logged_in?
end

def verify_user_has_permission!(permission)
  return halt(401, 'nao autorizado pois nao esta logado') if !user_is_logged_in?

  sinatra_roles_list = JWT.decode(session['keycloak_jwt_access_token'], nil, false)[0]['resource_access'][MY_SINATRA_APP_CONFIG.client_id]
  return halt(401, 'nao autorizado pq nao tem roles para o client_id da app') if !sinatra_roles_list || sinatra_roles_list.nil?

  roles = sinatra_roles_list['roles']
  return halt(401, 'nao autorizado pq nao possuem roles cadastradas') if !roles || roles.nil?

  roles.include?(permission) ? true : halt(401, 'nao autorizado pq nao consta na lista de roles')
end

def session_clear
  session['keycloak_jwt_raw_id_token'] = nil
  session['keycloak_jwt_access_token'] = nil
  session['refresh_token'] = nil
end

def refresh_token_now
  bodyParams = {
    client_id: MY_SINATRA_APP_CONFIG.client_id,
    client_secret: MY_SINATRA_APP_CONFIG.client_secret,
    grant_type: 'refresh_token',
    refresh_token: session['refresh_token']
  }

  url = "#{MY_SINATRA_APP_CONFIG.keycloak_docker_internal_url}/realms/#{MY_SINATRA_APP_CONFIG.realm}/protocol/openid-connect/token"

  res = Net::HTTP.post_form(URI(url), bodyParams)

  if res.code == '200' && res.body != ''
    session['keycloak_jwt_raw_id_token'] = JSON.parse(res.body)['id_token']
    session['keycloak_jwt_access_token'] = JSON.parse(res.body)['access_token']
    session['refresh_token'] = JSON.parse(res.body)['refresh_token']
  end

  res
end

def token_refreshed?
  res = refresh_token_now
  body = res.body != '' ? JSON.parse(res.body) : ''

  if res.code == '200'
    true
  else
    false
  end
end

def user_is_logged_in?
  jwt_access_token = session['keycloak_jwt_access_token']

  if !jwt_access_token || jwt_access_token == '' || jwt_access_token.nil?
    puts "JWT access token not exists"
    session_clear
    return false
  end

  jwt_access_token = JWT.decode(jwt_access_token, nil, false)[0]

  jwt_is_expired = Time.now.to_i >= jwt_access_token['exp']
  jwt_with_wrong_client = jwt_access_token['azp'] != MY_SINATRA_APP_CONFIG.client_id

  if jwt_is_expired
    puts "jwt expired, lets try to refresh it"

    if !token_refreshed?
      puts "JWT access token expired | refresh token expired too | Expired at #{Time.at(jwt_access_token['exp']).to_datetime}"
      session_clear
      false
    else
      true
    end
  elsif jwt_with_wrong_client
    puts "JWT access token with wrong client | #{jwt_access_token['azp']} vs #{MY_SINATRA_APP_CONFIG.client_id}"
    session_clear
    false
  else
    true
  end
end

def verify_jwt_signature!(jwts)
  access_token = JWT.decode(jwts['access_token'], nil, false)
  refresh_token = JWT.decode(jwts['refresh_token'], nil, false)
  id_token = JWT.decode(jwts['id_token'], nil, false)

  url = "#{MY_SINATRA_APP_CONFIG.keycloak_docker_internal_url}/realms/#{MY_SINATRA_APP_CONFIG.realm}/protocol/openid-connect/certs"

  res = Net::HTTP.get_response(URI(url))

  if res.code == '200' && res.body != ''
    certs = JSON.parse(res.body)

    # so e possivel validar a assinatura do access_token e id_token. o refresh token nao usa uma key q o keycloak permita buscar via API.
    [{ 'parsed_headers' => access_token[1], 'parsed_payload' => access_token[0], 'raw' => jwts['access_token'] }, { 'parsed_headers' => id_token[1], 'parsed_payload' => id_token[0], 'raw' => jwts['id_token'] }].each do |token|
      # https://stackoverflow.com/a/73750800
      JWT.decode(token['raw'], nil, true, { algorithms: [token['parsed_headers']['alg']], jwks: certs})
    end
  else
    halt(500, 'Keycloak certs is unavailable')
  end
end

get '/' do
  "My sinatra app for keycloak demo"
end

get '/refresh-token-now' do
  content_type :json
  res = refresh_token_now
  { code: res.code, body: JSON.parse(res.body)}.to_json
end

get '/my-session' do
  content_type :json
  {
    nonce: session['nonce'],
    state_csrf: session['state_csrf'],
    acc_token: session['keycloak_jwt_access_token'],
    refresh_token: session['refresh_token'],
    id_token: session['keycloak_jwt_raw_id_token']
  }.to_json
end

get '/session-clear-for-debug' do
  session.clear
  'Session clear for debug'
end

get '/admin' do
  verify_user_is_logged_in!
  content_type :json
  jwt = JWT.decode(session['keycloak_jwt_access_token'], nil, false)[0]
  "You are authenticated as #{jwt['name']} (#{jwt['email']})"
end

get '/admin-delete' do
  verify_user_is_logged_in!
  verify_user_has_permission! 'delete-records'
  content_type :json
  jwt = JWT.decode(session['keycloak_jwt_access_token'], nil, false)[0]
  "Admin-delete || You are authenticated as #{jwt['name']} (#{jwt['email']})"
end

get '/login' do
  redirect '/admin' if user_is_logged_in?

  nonce = SecureRandom.hex(10)
  state_csrf = SecureRandom.hex(10)

  # medidas de segurança (nonce e state_csrf) para evitar man-in-the-middle attacks
  # nonce = protege contra ataques de "replay" (gerar o msm access token mais de uma vez)
  # state = protege contra xrsf attack (qdo um atacante gera uma request fora do "fluxo normal")
  session['nonce'] = nonce
  session['state_csrf'] = state_csrf

  query_string_params = URI.encode_www_form({
    client_id: MY_SINATRA_APP_CONFIG.client_id,
    client_secret: MY_SINATRA_APP_CONFIG.client_secret,
    redirect_uri: "#{MY_SINATRA_APP_CONFIG.my_sinatra_app_base_url}/callback",
    response_type: 'code',
    scope: 'openid', # com scope=openid, vem o id_token na response do Keycloak
    nonce: nonce,
    state: state_csrf
  })

  redirect "#{MY_SINATRA_APP_CONFIG.keycloak_public_url}/realms/#{MY_SINATRA_APP_CONFIG.realm}/protocol/openid-connect/auth?#{query_string_params}"
end

get '/logout_done' do
  'You made logout, bye!'
end

get '/logout' do
  if !user_is_logged_in?
    return 'Logout done'
  end

  logoutParams = URI.encode_www_form({
    client_id: MY_SINATRA_APP_CONFIG.client_id,
    client_secret: MY_SINATRA_APP_CONFIG.client_secret,
    id_token_hint: session['keycloak_jwt_raw_id_token'],
    post_logout_redirect_uri: "#{MY_SINATRA_APP_CONFIG.my_sinatra_app_base_url}/logout_done"
  })

  session_clear

  redirect "#{MY_SINATRA_APP_CONFIG.keycloak_public_url}/realms/#{MY_SINATRA_APP_CONFIG.realm}/protocol/openid-connect/logout?#{logoutParams}"
end

get '/callback' do
  ## Checagens
  # - state
  # - nonce
  # - azp
  # - tempo de expiração
  # - signature
  ##
  redirect('/admin') if user_is_logged_in?

  content_type :json

  if params['state'] != session['state_csrf']
    halt 524, { message: "state_csrf invalido | #{params['state']} vs #{session['state_csrf']}" }.to_json
  end

  bodyParams = {
    client_id: MY_SINATRA_APP_CONFIG.client_id,
    client_secret: MY_SINATRA_APP_CONFIG.client_secret,
    grant_type: 'authorization_code',
    code: params['code'],
    redirect_uri: "#{MY_SINATRA_APP_CONFIG.my_sinatra_app_base_url}/callback"
  }

  url = "#{MY_SINATRA_APP_CONFIG.keycloak_docker_internal_url}/realms/#{MY_SINATRA_APP_CONFIG.realm}/protocol/openid-connect/token"

  res = Net::HTTP.post_form(URI(url), bodyParams)

  body = JSON.parse(res.body)

  jwt_access_token = body['access_token'] ? JWT.decode(body['access_token'], nil, false)[0] : ''
  jwt_refresh_token = body['refresh_token'] ? JWT.decode(body['refresh_token'], nil, false)[0] : ''
  jwt_id_token = body['id_token'] ? JWT.decode(body['id_token'], nil, false)[0] : ''

  # nonce é medida de segurança extra
  if jwt_access_token['nonce'] != session['nonce'] ||
     jwt_refresh_token['nonce'] != session['nonce'] ||
     jwt_id_token['nonce'] != session['nonce']
     halt 527, { message: "nonce invalido | #{jwt_access_token['nonce']} vs #{jwt_refresh_token['nonce']} vs #{jwt_id_token['nonce']} vs #{session['nonce']}" }.to_json
  end

  if jwt_access_token['azp'] != MY_SINATRA_APP_CONFIG.client_id ||
    jwt_refresh_token['azp'] != MY_SINATRA_APP_CONFIG.client_id ||
    jwt_id_token['azp'] != MY_SINATRA_APP_CONFIG.client_id
    halt 528, { message: 'azp invalido, precisa bater com o client id' }.to_json
  end

  time_now = Time.now.to_i
  jwt_is_expired = time_now >= jwt_access_token['exp'] || time_now >= jwt_refresh_token['exp'] || time_now >= jwt_id_token['exp']

  if jwt_is_expired
    halt 529, { message: 'token ja expirado' }.to_json
  end

  #verifica a assinatura do token bom base no kid do payload JWT do token (key id)
  verify_jwt_signature!(body)

  session['keycloak_jwt_access_token'] = body['access_token']
  session['refresh_token'] = body['refresh_token']
  session['keycloak_jwt_raw_id_token'] = body['id_token']

  redirect '/logged_in'
end

get '/logged_in' do
  'You are logged in, welcome!'
end
