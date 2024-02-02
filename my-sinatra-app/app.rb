require 'sinatra'
require 'sinatra/reloader'
require 'net/http'
require 'uri'
require 'jwt'
require 'securerandom'
require 'date'

configure do
  enable :reloader
  enable :sessions
end

MY_SINATRA_APP_CONFIG = OpenStruct.new(
  realm: 'my-company',
  keycloak_public_url: 'http://localhost:8080',
  keycloak_docker_internal_url: 'http://keycloak_server:8080',
  my_sinatra_app_base_url: 'http://localhost:3006',
  client_id: 'my-sinatra-app'
)

def verify_user_is_logged_in!
  redirect('/login') if !user_is_logged_in?
end

def verify_user_has_permission!(permission)
  return halt(401, 'nao autorizado pois nao esta logado') if !user_is_logged_in?

  sinatra_roles_list = session['keycloak_jwt_access_token']['resource_access'][MY_SINATRA_APP_CONFIG.client_id]
  return halt(401, 'nao autorizado pq nao tem roles para o client_id da app') if !sinatra_roles_list || sinatra_roles_list.nil?

  roles = sinatra_roles_list['roles']
  return halt(401, 'nao autorizado pq nao possuem roles cadastradas') if !roles || roles.nil?

  roles.include?(permission) ? true : halt(401, 'nao autorizado pq nao consta na lista de roles')
end

def session_clear
  session['keycloak_jwt_raw_id_token'] = nil
  session['keycloak_jwt_access_token'] = nil
end

def user_is_logged_in?
  jwt_access_token = session['keycloak_jwt_access_token']

  if !jwt_access_token || jwt_access_token == '' || jwt_access_token.nil?
    puts "JWT access token not exists"
    session_clear
    return false
  end

  jwt_is_expired = Time.now.to_i >= jwt_access_token['exp']
  jwt_with_wrong_client = jwt_access_token['azp'] != MY_SINATRA_APP_CONFIG.client_id

  if jwt_is_expired
    puts "JWT access token expired | Expired at #{Time.at(jwt_access_token['exp']).to_datetime}"
    session_clear
    false
  elsif jwt_with_wrong_client
    puts "JWT access token with wrong client | #{jwt_access_token['azp']} vs #{MY_SINATRA_APP_CONFIG.client_id}"
    session_clear
    false
  else
    true
  end
end

get '/' do
  "My sinatra app for keycloak demo"
end

get '/my-session' do
  content_type :json
  session.inspect.gsub("=>", ":").gsub(":nil", ":null")
end

get '/session-clear-for-debug' do
  session.clear
  'Session clear for debug'
end

get '/admin' do
  verify_user_is_logged_in!
  content_type :json
  "You are authenticated as #{session['keycloak_jwt_access_token']['name']} (#{session['keycloak_jwt_access_token']['email']})"
end

get '/admin-delete' do
  verify_user_is_logged_in!
  verify_user_has_permission! 'delete-records'
  content_type :json
  "Admin-delete || You are authenticated as #{session['keycloak_jwt_access_token']['name']} (#{session['keycloak_jwt_access_token']['email']})"
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
    id_token_hint: session['keycloak_jwt_raw_id_token'],
    post_logout_redirect_uri: "#{MY_SINATRA_APP_CONFIG.my_sinatra_app_base_url}/logout_done"
  })

  session_clear

  redirect "#{MY_SINATRA_APP_CONFIG.keycloak_public_url}/realms/#{MY_SINATRA_APP_CONFIG.realm}/protocol/openid-connect/logout?#{logoutParams}"
end

get '/callback' do
  redirect('/admin') if user_is_logged_in?

  content_type :json

  if params['state'] != session['state_csrf']
    halt 524, { message: "state_csrf invalido | #{params['state']} vs #{session['state_csrf']}" }.to_json
  end

  bodyParams = {
    client_id: MY_SINATRA_APP_CONFIG.client_id,
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

  session['keycloak_jwt_access_token'] = jwt_access_token
  session['keycloak_jwt_raw_id_token'] = body['id_token']

  redirect '/logged_in'
end

get '/logged_in' do
  'You are logged in, welcome!'
end
