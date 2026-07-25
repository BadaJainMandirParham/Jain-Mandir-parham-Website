type Listener = (event: string, session: Session | null) => void;

export interface User {
  id: string;
  email: string;
  user_metadata?: Record<string, string>;
}

export interface Session {
  access_token: string;
  user: User;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const SESSION_KEY = "mandirSession";
const listeners = new Set<Listener>();
const uploadBaseUrl = API_BASE_URL.replace(/\/api\/?$/, "");
const uploadedUrls = new Map<string, string>();

export const apiBaseUrl = API_BASE_URL;
export const backendBaseUrl = uploadBaseUrl;

const normalize = (value: any): any => {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== "object") return value;
  const out: any = { ...value };
  if (out._id && !out.id) out.id = String(out._id);
  for (const key of Object.keys(out)) out[key] = normalize(out[key]);
  return out;
};

const readSession = (): Session | null => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

const saveSession = (session: Session | null) => {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
  listeners.forEach((listener) => listener(session ? "SIGNED_IN" : "SIGNED_OUT", session));
};

const toSession = (data: any): Session => {
  if (data.session) return data.session;
  const user = data.user || {};
  return {
    access_token: data.access_token,
    user: {
      id: String(user._id || user.id),
      email: user.email,
      user_metadata: {
        display_name: user.name || user.user_metadata?.display_name,
        phone: user.phone || user.user_metadata?.phone,
      },
    },
  };
};

const request = async (path: string, init: RequestInit = {}) => {
  const session = readSession();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (session?.access_token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || payload.detail || payload.message || "Request failed");
  return normalize(payload);
};

class QueryBuilder {
  private filters: Record<string, string> = {};
  private orValue = "";
  private orderBy = "";
  private ascending = true;
  private take?: number;
  private wantSingle = false;
  private method = "GET";
  private body: any;
  private count = false;
  private head = false;

  constructor(private table: string) {}

  select(_columns = "*", options?: { count?: string; head?: boolean }) {
    this.count = Boolean(options?.count);
    this.head = Boolean(options?.head);
    return this;
  }

  eq(column: string, value: any) {
    this.filters[column] = String(value);
    return this;
  }

  or(value: string) {
    this.orValue = value;
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderBy = column;
    this.ascending = opts?.ascending !== false;
    return this;
  }

  limit(value: number) {
    this.take = value;
    return this;
  }

  single() {
    this.wantSingle = true;
    return this;
  }

  insert(body: any) {
    this.method = "POST";
    this.body = body;
    return this;
  }

  upsert(body: any) {
    this.method = "PUT";
    this.body = body;
    return this;
  }

  update(body: any) {
    this.method = "PATCH";
    this.body = body;
    return this;
  }

  delete() {
    this.method = "DELETE";
    return this;
  }

  private async exec() {
    const params = new URLSearchParams();
    Object.entries(this.filters).forEach(([key, value]) => params.append(key, value));
    if (this.orValue) params.set("or", this.orValue);
    if (this.orderBy) params.set("order", this.orderBy);
    params.set("ascending", String(this.ascending));
    if (this.take) params.set("limit", String(this.take));
    if (this.wantSingle) params.set("single", "true");
    if (this.count) params.set("count", "true");
    if (this.head) params.set("head", "true");
    const qs = params.toString();
    try {
      const payload = await request(`/tables/${this.table}${qs ? `?${qs}` : ""}`, {
        method: this.method,
        body: this.method === "GET" ? undefined : JSON.stringify(this.body),
      });
      return { data: payload.data ?? null, error: null, count: payload.count ?? null };
    } catch (error: any) {
      return { data: null, error, count: null };
    }
  }

  then(resolve: any, reject: any) {
    return this.exec().then(resolve, reject);
  }
}

export const supabase = {
  from(table: string) {
    return new QueryBuilder(table);
  },
  auth: {
    onAuthStateChange(callback: Listener) {
      listeners.add(callback);
      setTimeout(() => callback("INITIAL_SESSION", readSession()), 0);
      return { data: { subscription: { unsubscribe: () => { listeners.delete(callback); } } } };
    },
    async getSession() {
      return { data: { session: readSession() }, error: null };
    },
    async getUser() {
      return { data: { user: readSession()?.user ?? null }, error: null };
    },
    async signUp({ email, password, options }: any) {
      try {
        await request("/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            name: options?.data?.display_name || email.split("@")[0],
            phone: options?.data?.phone || "",
            accepted_privacy_policy: true,
            metadata: options?.data ?? {},
          }),
        });
        return { data: {}, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    async signInWithPassword({ email, password }: any) {
      try {
        const data = await request("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        saveSession(toSession(data));
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    async signOut() {
      saveSession(null);
      return { error: null };
    },
    async updateUser({ password, token }: any) {
      try {
        const resetToken = token || new URLSearchParams(window.location.search).get("token");
        await request(resetToken ? "/auth/reset-password" : "/auth/password", {
          method: resetToken ? "POST" : "PATCH",
          body: JSON.stringify({ password, token: resetToken }),
        });
        return { data: {}, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    async resetPasswordForEmail(email: string, _options?: unknown) {
      try {
        await request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
        return { data: {}, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    async setSession(session: Session) {
      saveSession(session);
      return { data: { session }, error: null };
    },
  },
  functions: {
    async invoke(name: string, options: any = {}) {
      try {
        const data = await request(`/functions/${name}`, {
          method: "POST",
          headers: options.headers,
          body: JSON.stringify(options.body ?? {}),
        });
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(fileName: string, file: File) {
          const form = new FormData();
          form.append("file", file, fileName);
          try {
            const payload = await request(`/storage/${bucket}/upload`, { method: "POST", body: form });
            if (payload?.data?.publicUrl) uploadedUrls.set(`${bucket}/${fileName}`, payload.data.publicUrl);
            return { data: { path: fileName }, error: null };
          } catch (error: any) {
            return { data: null, error };
          }
        },
        getPublicUrl(fileName: string) {
          return { data: { publicUrl: uploadedUrls.get(`${bucket}/${fileName}`) || `${uploadBaseUrl}/uploads/${bucket}/${fileName}` } };
        },
      };
    },
  },
  channel() {
    return { on: () => ({ subscribe: () => undefined }) };
  },
  removeChannel() {
    return undefined;
  },
};
