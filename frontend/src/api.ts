type Csrf = { token: string; headerName: string };

let csrf: Csrf | null = null;
let csrfRequest: Promise<void> | null = null;

const requestInit = { credentials: "include" as RequestCredentials, signal: AbortSignal.timeout(20_000) };

function unavailableMessage(response?: Response) {
  const contentType = response?.headers.get("content-type") ?? "";
  if (response && contentType.includes("text/html")) {
    return "The atelier API is temporarily unavailable. Please try again shortly.";
  }
  return "The atelier is temporarily unavailable. Please try again shortly.";
}

async function responseMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null) as { message?: string } | null;
    if (data?.message) return data.message;
  }
  return unavailableMessage(response);
}

export async function refreshCsrf() {
  if (csrfRequest) return csrfRequest;
  csrfRequest = (async () => {
    let response: Response;
    try {
      response = await fetch("/api/auth/csrf", requestInit);
    } catch {
      throw new Error(unavailableMessage());
    }
    if (!response.ok) throw new Error(await responseMessage(response));
    csrf = await response.json() as Csrf;
  })();
  try {
    await csrfRequest;
  } finally {
    csrfRequest = null;
  }
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
      ...requestInit,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(unavailableMessage());
  }
  if (!response.ok) {
    throw new Error(await responseMessage(response));
  }
  if (response.status === 204 || response.headers.get("content-length") === "0")
    return undefined as T;
  const text = await response.text();
  return text ? JSON.parse(text) : (undefined as T);
}
export async function login(email: string, password: string) {
  csrf = null;
  await refreshCsrf();
  let response: Response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      ...requestInit,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        [csrf!.headerName]: csrf!.token,
      },
      body: new URLSearchParams({ email, password }),
    });
  } catch {
    throw new Error(unavailableMessage());
  }
  if (!response.ok) {
    throw new Error(await responseMessage(response));
  }
  csrf = null;
  await refreshCsrf();
}
