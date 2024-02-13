# app_a.rb
require 'sinatra'
require 'sinatra/reloader'
require 'net/http'
require 'uri'
require 'jwt'

configure do
  enable :reloader
  set :client_id, 'backend-app-a'
  set :client_secret, 'MAE6mgUvXhiKAXrvShaatBCos00Bh1ew'
  set :realm, 'my-company'
  set :auth_server_url, 'https://4f43-177-33-138-202.ngrok-free.app'
end

def get_access_token
  uri = URI("#{settings.auth_server_url}/realms/#{settings.realm}/protocol/openid-connect/token")
  params = {
    'client_id' => settings.client_id,
    'client_secret' => settings.client_secret,
    'grant_type' => 'client_credentials'
  }

  response = Net::HTTP.post_form(uri, params)
  tokens = JSON.parse(response.body)
  tokens['access_token']
end

get '/' do
  access_token = get_access_token

  # Chama App B
  uri = URI('http://app_b:9292/validate_token')
  http = Net::HTTP.new(uri.host, uri.port)
  request = Net::HTTP::Get.new(uri.request_uri)
  request['Authorization'] = "Bearer #{access_token}"

  response = http.request(request)

  "Response of APP B => #{response.code} #{response.body}"
end
