"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  Sun,
  Moon,
  HelpCircle,
  Settings,
  Bot,
  AlertTriangle,
  Menu,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import TemplateCreator from "@/components/TemplateCreator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import UserButton from "@/components/UserButton";
import { Label } from "@/components/ui/label";
import { employeeNavigation, navigation } from "@/constants/constant";
import ChatPage from "@/components/chatbot/chat_page";

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const location = usePathname();
  const [alertMessage, setAlertMessage] = useState(false);
  const [user, setUser] = useState(null);
  const [type, setType] = useState(null);
  const [navigationItems, setNavigationItems] = useState(navigation);
  const router = useRouter();
  const [botOpen, setBotOpen] = useState(false);

  useEffect(() => {
    const storedType = localStorage.getItem("type");
    setType(storedType);

    if (storedType === "employee") {
      const employee = localStorage.getItem("employee");
      setNavigationItems(employeeNavigation);
      if (employee) setUser(JSON.parse(employee));
      else router.push("/");
    } else {
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
      else router.push("/");
    }
  }, [router]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") === "true";
    setDarkMode(savedTheme);
    if (savedTheme) document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col transition-colors duration-300",
        "bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100",
      )}
    >
      {/* --- TOP GLOBAL NAVIGATION --- */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo & Branding */}
            <div className="flex items-center gap-8">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 group"
              >
                {/* <div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/20 group-hover:scale-105 transition-transform">
                  <span className="text-white font-bold text-lg">S</span>
                </div> */}
                <div className="relative h-10 w-10 flex items-center justify-center overflow-hidden">
                  <img
                    src="/pibi_logo.webp"
                    alt="Pibi Logo"
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold bg-gradient-to-r from-[#25C2A0] via-[#266d61] to-[#235d76] bg-clip-text text-transparent">
                    Smart CRM
                  </span>
                </div>
              </Link>

              {/* Desktop Menu */}
              <nav className="hidden lg:flex items-center gap-1">
                {navigationItems.map((item) => {
                  const isActive =
                    location === item.href ||
                    item.subpages?.some((s) => location === s.href);
                  const hasSub = item.subpages?.length > 0;

                  return (
                    <div key={item.name} className="relative group/nav">
                      <Link
                        href={hasSub ? "#" : item.href}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all",
                          isActive
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800",
                        )}
                        onClick={(e) => hasSub && e.preventDefault()}
                      >
                        {item.name}
                        {hasSub && (
                          <ChevronDown className="h-3.5 w-3.5 opacity-50 group-hover/nav:rotate-180 transition-transform" />
                        )}
                      </Link>

                      {/* Professional Mega-Dropdown */}
                      {hasSub && (
                        <div className="absolute top-full left-0 mt-1 w-64 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:translate-y-0 group-hover/nav:pointer-events-auto transition-all duration-200 z-50">
                          {item.subpages.map((sub) => (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group/sub"
                            >
                              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover/sub:bg-teal-100 dark:group-hover/sub:bg-teal-900/30 text-slate-500 group-hover/sub:text-teal-600 transition-colors">
                                {sub.icon || <div className="h-4 w-4" />}
                              </div>
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover/sub:text-slate-900 dark:group-hover/sub:text-white">
                                {sub.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Alert Notification */}
              {user && type === "admin" && !user.refresh_token && (
                <div className="relative flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-amber-500 animate-pulse"
                    onMouseEnter={() => setAlertMessage(true)}
                    onMouseLeave={() => setAlertMessage(false)}
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </Button>
                  {alertMessage && (
                    <div className="absolute top-12 right-0 w-72 p-4 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl border border-amber-200 text-xs z-[60]">
                      <p className="font-semibold text-slate-900 dark:text-white mb-1">
                        Gmail Disconnected
                      </p>
                      <p className="text-slate-500 mb-2">
                        Connect your account to enable automated lead responses.
                      </p>
                      <Link
                        href="/api/auth/email"
                        className="text-teal-600 font-bold hover:underline"
                      >
                        Connect Gmail →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <div className="hidden sm:flex items-center gap-1 border-x border-slate-200 dark:border-slate-800 px-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-slate-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Settings className="h-4 w-4" />
                      <span className="text-md font-medium">Settings</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 mt-2 rounded-xl"
                  >
                    <DropdownMenuItem
                      onClick={() => router.push("/company_details")}
                    >
                      Company Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <TemplateCreator />
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="text-slate-500 rounded-full"
                >
                  {darkMode ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <UserButton />

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-slate-600"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 animate-in slide-in-from-top-4 duration-300">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-10">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
          {children}
        </div>
      </main>

      {/* --- FLOATING ACTIONS --- */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4">
        <Button
          onClick={() => setBotOpen(true)}
          className="h-14 w-14 rounded-2xl bg-slate-900 dark:bg-teal-600 hover:bg-teal-700 text-white shadow-2xl transition-all hover:-translate-y-1 active:scale-95 group"
        >
          <Bot className="h-7 w-7 group-hover:rotate-12 transition-transform" />
        </Button>
      </div>

      {botOpen && <ChatPage onClose={() => setBotOpen(false)} />}

      {/* Support Button (Bottom Left) */}
      <div className="fixed bottom-8 left-8 hidden md:block">
        <Button
          variant="outline"
          size="sm"
          className="bg-white/50 dark:bg-slate-900/50 backdrop-blur rounded-full border-slate-200 dark:border-slate-800 gap-2 text-slate-500"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="text-xs">Support</span>
        </Button>
      </div>
    </div>
  );
}
