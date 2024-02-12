import { useContext, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthProvider";
import Cookies from "js-cookie";

/**
 * Example of callback URL sent by Keycloak (data is sent over "URL fragment (after hash '#' in URL). This is for security purposes, to server not get this data"):
 * http://localhost:3018/callback#state=0.3jtphhz21eh&session_state=af9b5f69-490b-4745-8dc5-4793e649715c&iss=http%3A%2F%2Flocalhost%3A8080%2Frealms%2Fmy-company&id_token=eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJuUkhDVTM3WW5HSlk1SmFMWDFrdDJLVmNhUm4wd2NMZHpock9ESjhUeGg4In0.eyJleHAiOjE3MDcwODA4MzQsImlhdCI6MTcwNzA3OTkzNCwiYXV0aF90aW1lIjoxNzA3MDc5OTM0LCJqdGkiOiIwNzY1M2MxYi1iMjc5LTQyODEtOTA1Yi1kNGU5ZWMxMGJlNTEiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvcmVhbG1zL215LWNvbXBhbnkiLCJhdWQiOiJteS1yZWFjdC1hcHAiLCJzdWIiOiIzYTdkYzRjNi0wODI3LTRjZDMtYmVjNS1kY2Q5MDE3ZjA3NjkiLCJ0eXAiOiJJRCIsImF6cCI6Im15LXJlYWN0LWFwcCIsIm5vbmNlIjoiMC4zZGk0bDNidjAydiIsInNlc3Npb25fc3RhdGUiOiJhZjliNWY2OS00OTBiLTQ3NDUtOGRjNS00NzkzZTY0OTcxNWMiLCJhdF9oYXNoIjoiQm0wYWkxb3ZoUFN4WTdoSl9uYjJxUSIsImFjciI6IjEiLCJzX2hhc2giOiJFX1c4ZWRPOE1fMjB2MjlNdy1vWVpBIiwic2lkIjoiYWY5YjVmNjktNDkwYi00NzQ1LThkYzUtNDc5M2U2NDk3MTVjIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJCb2IiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJib2IiLCJnaXZlbl9uYW1lIjoiQm9iIiwiZW1haWwiOiJib2JAbWFpbC5jb20ifQ.OBmoV3Z2ZQOb6VxJNlBWs93Sqb_W-RDZXOBw0XsZbUvIQddSBzmlc2Bi0_KrxUhB3R_HA1Vxmo9svtWraGgwdLR9d7Z3EeluCSE2Wah6XeaASjsULgFCXUp2SUANF5fd9prs-Ilvfj4Yn6xY1PV3lHm3a0ohU-R1osSrB5KeRI5zaH7sz63J9S-QbvW_CT0aNvP37Hymy1qEy_2z0s6WXzFTPaNc2hk0jx2oIUJ20FYlzVa4Be2TJhqd_VtNJj2TD9dVQ4jVXGQA5NGbmjf7sPS8OjVEmc0j5I3UTlabcNGWXDLpdHgeJraR8P5q33f97JQ288BD8s1sbMfSWr6ojQ&access_token=eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJuUkhDVTM3WW5HSlk1SmFMWDFrdDJLVmNhUm4wd2NMZHpock9ESjhUeGg4In0.eyJleHAiOjE3MDcwODA4MzQsImlhdCI6MTcwNzA3OTkzNCwiYXV0aF90aW1lIjoxNzA3MDc5OTM0LCJqdGkiOiI2NmQyMmRhMC1hNGY0LTQyMTAtYWFjMS04MTliNDI3YzY2MWUiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvcmVhbG1zL215LWNvbXBhbnkiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiM2E3ZGM0YzYtMDgyNy00Y2QzLWJlYzUtZGNkOTAxN2YwNzY5IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibXktcmVhY3QtYXBwIiwibm9uY2UiOiIwLjNkaTRsM2J2MDJ2Iiwic2Vzc2lvbl9zdGF0ZSI6ImFmOWI1ZjY5LTQ5MGItNDc0NS04ZGM1LTQ3OTNlNjQ5NzE1YyIsImFjciI6IjEiLCJhbGxvd2VkLW9yaWdpbnMiOlsiaHR0cDovL2xvY2FsaG9zdDozMDE4Il0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJkZWZhdWx0LXJvbGVzLW15LWNvbXBhbnkiLCJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJwcm9maWxlIGVtYWlsIiwic2lkIjoiYWY5YjVmNjktNDkwYi00NzQ1LThkYzUtNDc5M2U2NDk3MTVjIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJCb2IiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJib2IiLCJnaXZlbl9uYW1lIjoiQm9iIiwiZW1haWwiOiJib2JAbWFpbC5jb20ifQ.e4rLNIbrDIczKkuTpP08NsZ4jKnvM4nSyHbAQ8P7y-oVGkUt1Z_ChobWfIr8Sd4VSM5WRfbsERMIwTnC9w9CUW1CsN1_oMXFEQzkRte4c4dtyJMYEzznUtGF8ETRk0bHFJqALPAR_PIfV71wdhPXHb41HFxRKkI1s7W89fjKyCuwH221D_SNkZzRB3EZT1jECcPYVMFd1d6duTyocqPzDk6FRpDWnWzrZADs-SFfEmydFPcTU4gaPZTWMS6Imfx2pI_2ht1TyNzM-8Djt1ow6HtBen9fYq6oDm-P9a7IW4k9X3dp91XSB2o5oNZLW_27CIgpJy6wyXSHUs_E6XNFUg&token_type=Bearer&expires_in=900
 *
 * http://localhost:3018/callback#state=0.3jtphhz21eh
 *                               &session_state=af9b5f69-490b-4745-8dc5-4793e649715c
 *                               &iss=http%3A%2F%2Flocalhost%3A8080%2Frealms%2Fmy-company
 *                               &id_token=eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJuUkhDVTM3WW5HSlk1SmFMWDFrdDJLVmNhUm4wd2NMZHpock9ESjhUeGg4In0.eyJleHAiOjE3MDcwODA4MzQsImlhdCI6MTcwNzA3OTkzNCwiYXV0aF90aW1lIjoxNzA3MDc5OTM0LCJqdGkiOiIwNzY1M2MxYi1iMjc5LTQyODEtOTA1Yi1kNGU5ZWMxMGJlNTEiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvcmVhbG1zL215LWNvbXBhbnkiLCJhdWQiOiJteS1yZWFjdC1hcHAiLCJzdWIiOiIzYTdkYzRjNi0wODI3LTRjZDMtYmVjNS1kY2Q5MDE3ZjA3NjkiLCJ0eXAiOiJJRCIsImF6cCI6Im15LXJlYWN0LWFwcCIsIm5vbmNlIjoiMC4zZGk0bDNidjAydiIsInNlc3Npb25fc3RhdGUiOiJhZjliNWY2OS00OTBiLTQ3NDUtOGRjNS00NzkzZTY0OTcxNWMiLCJhdF9oYXNoIjoiQm0wYWkxb3ZoUFN4WTdoSl9uYjJxUSIsImFjciI6IjEiLCJzX2hhc2giOiJFX1c4ZWRPOE1fMjB2MjlNdy1vWVpBIiwic2lkIjoiYWY5YjVmNjktNDkwYi00NzQ1LThkYzUtNDc5M2U2NDk3MTVjIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJCb2IiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJib2IiLCJnaXZlbl9uYW1lIjoiQm9iIiwiZW1haWwiOiJib2JAbWFpbC5jb20ifQ.OBmoV3Z2ZQOb6VxJNlBWs93Sqb_W-RDZXOBw0XsZbUvIQddSBzmlc2Bi0_KrxUhB3R_HA1Vxmo9svtWraGgwdLR9d7Z3EeluCSE2Wah6XeaASjsULgFCXUp2SUANF5fd9prs-Ilvfj4Yn6xY1PV3lHm3a0ohU-R1osSrB5KeRI5zaH7sz63J9S-QbvW_CT0aNvP37Hymy1qEy_2z0s6WXzFTPaNc2hk0jx2oIUJ20FYlzVa4Be2TJhqd_VtNJj2TD9dVQ4jVXGQA5NGbmjf7sPS8OjVEmc0j5I3UTlabcNGWXDLpdHgeJraR8P5q33f97JQ288BD8s1sbMfSWr6ojQ
 *                               &access_token=eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJuUkhDVTM3WW5HSlk1SmFMWDFrdDJLVmNhUm4wd2NMZHpock9ESjhUeGg4In0.eyJleHAiOjE3MDcwODA4MzQsImlhdCI6MTcwNzA3OTkzNCwiYXV0aF90aW1lIjoxNzA3MDc5OTM0LCJqdGkiOiI2NmQyMmRhMC1hNGY0LTQyMTAtYWFjMS04MTliNDI3YzY2MWUiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvcmVhbG1zL215LWNvbXBhbnkiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiM2E3ZGM0YzYtMDgyNy00Y2QzLWJlYzUtZGNkOTAxN2YwNzY5IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibXktcmVhY3QtYXBwIiwibm9uY2UiOiIwLjNkaTRsM2J2MDJ2Iiwic2Vzc2lvbl9zdGF0ZSI6ImFmOWI1ZjY5LTQ5MGItNDc0NS04ZGM1LTQ3OTNlNjQ5NzE1YyIsImFjciI6IjEiLCJhbGxvd2VkLW9yaWdpbnMiOlsiaHR0cDovL2xvY2FsaG9zdDozMDE4Il0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJkZWZhdWx0LXJvbGVzLW15LWNvbXBhbnkiLCJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJwcm9maWxlIGVtYWlsIiwic2lkIjoiYWY5YjVmNjktNDkwYi00NzQ1LThkYzUtNDc5M2U2NDk3MTVjIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJCb2IiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJib2IiLCJnaXZlbl9uYW1lIjoiQm9iIiwiZW1haWwiOiJib2JAbWFpbC5jb20ifQ.e4rLNIbrDIczKkuTpP08NsZ4jKnvM4nSyHbAQ8P7y-oVGkUt1Z_ChobWfIr8Sd4VSM5WRfbsERMIwTnC9w9CUW1CsN1_oMXFEQzkRte4c4dtyJMYEzznUtGF8ETRk0bHFJqALPAR_PIfV71wdhPXHb41HFxRKkI1s7W89fjKyCuwH221D_SNkZzRB3EZT1jECcPYVMFd1d6duTyocqPzDk6FRpDWnWzrZADs-SFfEmydFPcTU4gaPZTWMS6Imfx2pI_2ht1TyNzM-8Djt1ow6HtBen9fYq6oDm-P9a7IW4k9X3dp91XSB2o5oNZLW_27CIgpJy6wyXSHUs_E6XNFUg
 *                               &token_type=Bearer
 *                               &expires_in=900
 */

export function Callback() {
  const { hash } = useLocation();
  const { login, auth } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (auth) {
      navigate("/login");
      return;
    }

    const rawHash = hash.replace("#", "");
    const searchParams = new URLSearchParams(rawHash);

    Cookies.set('keycloack_callback_params', rawHash);
    console.log("keycloack_callback_params", Object.fromEntries(searchParams.entries()));

    const accessToken = searchParams.get("access_token") as string;
    const idToken = searchParams.get("id_token") as string;
    const code = searchParams.get("code") as string;
    const state = searchParams.get("state") as string;

    if (!accessToken || !idToken || !state) {
      navigate("/login");
    }

    login(accessToken, idToken, state, code);

  }, [hash, login, auth, navigate]);

  return <div>Loading callback...</div>;
}
