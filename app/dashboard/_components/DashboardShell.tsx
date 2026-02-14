"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "../actions";

function SidebarLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <li>
      <Link
        href={href}
        className={`rounded-xl gap-3 ${isActive ? "active" : ""}`}
      >
        <span className="text-primary">{icon}</span>
        <span className="font-medium">{label}</span>
      </Link>
    </li>
  );
}

export default function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="drawer lg:drawer-open">
        <input id="dash-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col">
          <div className="navbar bg-base-100/80 backdrop-blur border-b border-base-300 sticky top-0 z-50">
            <div className="flex-none lg:hidden">
              <label
                htmlFor="dash-drawer"
                className="btn btn-ghost btn-sm"
                aria-label="Open navigation"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </label>
            </div>

            <div className="flex-1">
              <Link
                className="btn btn-ghost text-lg sm:text-xl tracking-tight"
                href="/dashboard/projects"
              >
                <span className="font-semibold">Copilot</span>
                <span className="opacity-70 font-normal hidden sm:inline"> Workspace</span>
              </Link>
            </div>

            <div className="flex-none gap-2">
              <Link href="/panel" className="btn btn-primary btn-sm hidden sm:inline-flex">
                Open panel
              </Link>

              <div className="dropdown dropdown-end dropdown-bottom">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                  <div className="avatar placeholder">
                    <div className="rounded-full w-9 h-9 bg-gradient-to-br from-[#FF6B00] to-[#FFA63D] p-[2px]">
                      <div className="rounded-full w-full h-full bg-base-100 flex items-center justify-center">
                        <span className="text-xs font-semibold text-[#FF6B00]">
                          {(userEmail ?? "U").slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <ul
                  tabIndex={0}
                  className="dropdown-content z-[100] menu p-2 shadow-xl bg-base-100/90 backdrop-blur rounded-2xl w-64 border border-base-300 mt-3"
                >
                  <li className="menu-title">
                    <span className="truncate">{userEmail ?? "Account"}</span>
                  </li>
                  <li className="sm:hidden">
                    <Link href="/panel">Open panel</Link>
                  </li>
                  <li>
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="text-error font-semibold hover:bg-error/10 active:bg-error/15"
                      >
                        Logout
                      </button>
                    </form>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <main className="px-4 md:px-6 py-6">{children}</main>
        </div>

        <div className="drawer-side">
          <label htmlFor="dash-drawer" className="drawer-overlay" />
          <aside className="w-72 min-h-full bg-base-100/80 backdrop-blur border-r border-base-300">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <Link href="/dashboard/projects" className="text-lg font-semibold tracking-tight">
                  Copilot
                </Link>
                <span className="badge badge-outline">SaaS</span>
              </div>

              <div className="mt-6">
                <div className="text-xs uppercase tracking-wider opacity-60 px-2">
                  Navigation
                </div>
                <ul className="menu px-0 mt-2 gap-1">
                  <SidebarLink
                    href="/dashboard/projects"
                    label="Projects"
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                      >
                        <path d="M4 6a2 2 0 0 1 2-2h3a1 1 0 0 1 1 1v1h8a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6Z" />
                      </svg>
                    }
                  />
                  <SidebarLink
                    href="/dashboard/prompt"
                    label="Prompt"
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                      >
                        <path d="M7 4a3 3 0 0 0-3 3v9a4 4 0 0 0 4 4h5.586a2 2 0 0 0 1.414-.586l3.414-3.414A2 2 0 0 0 19 14.586V7a3 3 0 0 0-3-3H7Zm10 10.586L13.586 18H8a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v7.586Z" />
                      </svg>
                    }
                  />
                </ul>
              </div>

              <div className="mt-4">
                <Link href="/panel" className="btn btn-primary w-full">
                  Open panel
                </Link>
              </div>

              <div className="mt-6 rounded-2xl border border-base-300 bg-base-100/60 p-4">
                <div className="text-xs opacity-70">Signed in as</div>
                <div className="text-sm font-semibold truncate mt-1">
                  {userEmail ?? "Account"}
                </div>
                <div className="text-xs opacity-60 mt-1">Secure session</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
