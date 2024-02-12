import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import { decodeJwt, decodeProtectedHeader } from "jose";
import Cookies from "js-cookie";

export function Admin() {
  const { auth } = useContext(AuthContext);
  const headers_jwt = JSON.stringify(decodeProtectedHeader(Cookies.get("access_token")), null, 2);
  const payload = JSON.stringify(auth, null, 2);
  //@ts-expect-error sdf
  const keycloack_callback_params = JSON.stringify(Object.fromEntries((new URLSearchParams(Cookies.get('keycloack_callback_params'))).entries()), null, 2);

  const headers_id_jwt = JSON.stringify(decodeProtectedHeader(Cookies.get("id_token")), null, 2);
  const payload_id = JSON.stringify(decodeJwt(Cookies.get("id_token")), null, 2);

  return (
    <div>
      <h1>Admin</h1>
      <br/>Keycloack callback params<br/>
      <pre>{keycloack_callback_params}</pre>
      <br/>==================================<br/>
      <br/>JWT access token - Headers<br/>
      <pre>{headers_jwt}</pre>
      <br/>JWT access token - Payload<br/>
      <pre>{payload}</pre>
      <br/>==================================<br/>
      <br/>JWT id token - Headers<br/>
      <pre>{headers_id_jwt}</pre>
      <br/>JWT id token - Payload<br/>
      <pre>{payload_id}</pre>
    </div>
  );
}
