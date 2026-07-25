import React, { createContext, createElement, forwardRef, useContext, useEffect, useMemo, useState } from "react";

type Params = Record<string, string>;
type RouterContextValue = {
  path: string;
  params: Params;
  navigate: (to: string | number, options?: { replace?: boolean }) => void;
};

const RouterContext = createContext<RouterContextValue | null>(null);

const currentPath = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

export const BrowserRouter = ({ children }: { children: React.ReactNode }) => {
  const [path, setPath] = useState(currentPath());
  const [params, setParams] = useState<Params>({});

  const navigate = (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }
    if (options?.replace) window.history.replaceState(null, "", to);
    else window.history.pushState(null, "", to);
    setPath(currentPath());
  };

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const value = useMemo(() => ({ path, params, navigate }), [path, params]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

const matchRoute = (pattern: string, pathname: string) => {
  if (pattern === "*") return { matched: true, params: {} };
  const routeParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (routeParts.length !== pathParts.length) return { matched: false, params: {} };
  const params: Params = {};
  for (let i = 0; i < routeParts.length; i += 1) {
    const routePart = routeParts[i];
    const pathPart = pathParts[i];
    if (routePart.startsWith(":")) params[routePart.slice(1)] = decodeURIComponent(pathPart);
    else if (routePart !== pathPart) return { matched: false, params: {} };
  }
  return { matched: true, params };
};

export const Routes = ({ children }: { children: React.ReactNode }) => {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("Routes must be used inside BrowserRouter");
  const pathname = window.location.pathname;
  let fallback: React.ReactElement | null = null;

  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement(child)) continue;
    const props = child.props as { path?: string; element?: React.ReactElement };
    if (props.path === "*") fallback = props.element ?? null;
    const result = matchRoute(props.path || "/", pathname);
    if (result.matched) {
      ctx.params = result.params;
      return props.element ?? null;
    }
  }

  return fallback;
};

export const Route = (_props: { path: string; element: React.ReactElement }) => null;

export const Link = ({
  to,
  replace,
  children,
  onClick,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean }) => {
  const navigate = useNavigate();
  return (
    <a
      {...props}
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(to, { replace });
      }}
    >
      {children}
    </a>
  );
};

export type NavLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
  replace?: boolean;
  className?: string | ((props: { isActive: boolean; isPending: boolean }) => string | undefined);
};

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ to, className, ...props }, ref) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    const resolvedClassName = typeof className === "function"
      ? className({ isActive, isPending: false })
      : className;
    return createElement(Link, { ...props, to, ref, className: resolvedClassName });
  },
);

NavLink.displayName = "NavLink";

export const Navigate = ({ to, replace }: { to: string; replace?: boolean }) => {
  const navigate = useNavigate();
  useEffect(() => navigate(to, { replace }), [navigate, replace, to]);
  return null;
};

export const useNavigate = () => {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useNavigate must be used inside BrowserRouter");
  return ctx.navigate;
};

export const useParams = <T extends Params = Params>() => {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useParams must be used inside BrowserRouter");
  return ctx.params as T;
};

export const useLocation = () => {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useLocation must be used inside BrowserRouter");
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: null,
    key: "default",
  };
};
