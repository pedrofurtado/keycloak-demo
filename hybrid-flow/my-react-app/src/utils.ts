import Cookies from "js-cookie";
import { decodeJwt } from "jose";

export function makeLoginUrl() {
  const nonce = Math.random().toString(36);
  const state = Math.random().toString(36);

  //lembrar armazenar com cookie seguro (https)
  Cookies.set("nonce", nonce);
  Cookies.set("state", state);

  const loginUrlParams = new URLSearchParams({
    client_id: "my-react-app",
    redirect_uri: "http://localhost:3018/callback",
    response_type: "token id_token code", // "code" serve especificamente para hybrid flow (para trazer o authorization code no callback). "token" obtem o acess_token. "id_token" obtem o token do openid (o token do openid é usado para fazer o logout no keycloak)
    nonce: nonce,
    state: state,
  });

  return `https://43df-177-33-138-202.ngrok-free.app/realms/my-company/protocol/openid-connect/auth?${loginUrlParams.toString()}`;
}

export function exchangeCodeForToken(code: string) {
  const tokenUrlParams = new URLSearchParams({
    client_id: "my-react-app",
    grant_type: "authorization_code",
    code: code,
    redirect_uri: "http://localhost:3018/callback",
    nonce: Cookies.get("nonce") as string,
  });

  return fetch(
    "https://43df-177-33-138-202.ngrok-free.app/realms/my-company/protocol/openid-connect/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenUrlParams.toString(),
    }
  )
    .then((res) => res.json())
    .then((res) => {
      console.log('exchange code for token SUCCESS', res)
      return login(res.access_token, null, null as any, res.refresh_token);
    });
}

export function login(accessToken: string, idToken?: string, state?: string, refreshToken?: string) {
  const stateCookie = Cookies.get("state");
  if (state && stateCookie !== state) {
    throw new Error("Invalid state");
  }

  let decodedAccessToken = null;
  let decodedIdToken = null;
  let decodedRefreshToken = null;
  try {
    decodedAccessToken = decodeJwt(accessToken);
    if(idToken) {
      decodedIdToken = decodeJwt(idToken);
    }
    if(refreshToken) {
      decodedRefreshToken = decodeJwt(refreshToken);
    }
  } catch (e) {
    throw new Error(`Invalid token ${e.message}`);
  }

  if (decodedAccessToken.nonce !== Cookies.get("nonce")) {
    throw new Error("Invalid nonce access");
  }

  if (decodedIdToken && decodedIdToken.nonce !== Cookies.get("nonce")) {
    throw new Error("Invalid nonce id");
  }

  if (decodedRefreshToken && decodedRefreshToken.nonce !== Cookies.get("nonce")) {
    throw new Error("Invalid nonce refresh");
  }

  Cookies.set("access_token", accessToken);

  if(idToken) {
    Cookies.set("id_token", idToken);
  }

  if(refreshToken) {
    Cookies.set("refresh_token", refreshToken);
  }

  return decodedAccessToken;
}

export function getAuth() {
  const token = Cookies.get("access_token");

  if (!token) {
    return null;
  }

  try {
    return decodeJwt(token);
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function makeLogoutUrl() {
  if (!Cookies.get("id_token")) {
    return false;
  }
  const logoutParams = new URLSearchParams({
    client_id: "my-react-app",
    id_token_hint: Cookies.get("id_token") as string,
    post_logout_redirect_uri: "http://localhost:3018/",
  });

  Cookies.remove("access_token");
  Cookies.remove("id_token");
  Cookies.remove("refresh_token");
  Cookies.remove("nonce");
  Cookies.remove("state");
  Cookies.remove('keycloack_callback_params');

  return `https://43df-177-33-138-202.ngrok-free.app/realms/my-company/protocol/openid-connect/logout?${logoutParams.toString()}`;
}
