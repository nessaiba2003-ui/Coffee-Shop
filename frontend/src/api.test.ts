import { afterEach, describe, expect, it, vi } from "vitest";

describe("API client", () => {
  afterEach(() => vi.restoreAllMocks());

  it("explains an HTML fallback response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html></html>", {
      status: 404,
      headers: { "content-type": "text/html" },
    })));
    const { api } = await import("./api");
    await expect(api("/catalog")).rejects.toThrow("service is not connected");
  });

  it("uses the production API path for requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("./api");
    await expect(api<{ ok: boolean }>("/catalog")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/catalog", expect.objectContaining({ credentials: "include" }));
  });
});
