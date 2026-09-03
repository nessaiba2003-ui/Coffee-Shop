let csrf: { token: string; headerName: string } | null = null;
export async function refreshCsrf() {
  const response = await fetch("/api/auth/csrf", { credentials: "include" });
  if (!response.ok)
    throw new Error(
      "The atelier is currently offline. Please try again shortly.",
    );
  csrf = await response.json();
}
export async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (method !== "GET" && !csrf) await refreshCsrf();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET" && csrf) headers[csrf.headerName] = csrf.token;
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "The atelier is currently offline. Your creation is safe in this browser.",
    );
  }
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({
        message:
          "The atelier could not complete this request. Please try again.",
      }));
    throw new Error(error.message || "Something went wrong.");
  }
  if (response.status === 204 || response.headers.get("content-length") === "0")
    return undefined as T;
  const text = await response.text();
  return text ? JSON.parse(text) : (undefined as T);
}
export async function login(email: string, password: string) {
  await refreshCsrf();
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      [csrf!.headerName]: csrf!.token,
    },
    body: new URLSearchParams({ email, password }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message);
  }
  await refreshCsrf();
}
