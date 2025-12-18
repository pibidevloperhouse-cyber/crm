"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  HelpCircle,
  Settings,
  Bot,
  AlertTriangleIcon,
  SquareUser,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
// import OurProspects from "./prospects/page";
import TemplateCreator from "@/components/TemplateCreator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import UserButton from "@/components/UserButton";
import { Label } from "@/components/ui/label";

import { employeeNavigation, navigation } from "@/constants/constant";
import Hamburger from "hamburger-react";
import OurProspects from "./prospects/page";
import ChatPage from "@/components/chatbot/chat_page";



export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [expandedItems, setExpandedItems] = useState([]);
  const location = usePathname();
  const [alertMessage, setAlertMessage] = useState(false);
  const [user, setUser] = useState(null);
  const [type, setType] = useState(null);
  const [navigationItems, setNavigationItems] = useState(navigation);
  const router = useRouter();
  const [botOpen, setBotOpen] = useState(false);

  useEffect(() => {
    const type = localStorage.getItem("type");
    setType(type);

    if (type === "employee") {
      const employee = localStorage.getItem("employee");
      setNavigationItems(employeeNavigation);
      if (employee) {
        setUser(JSON.parse(employee));
      } else {
        router.push("/");
      }
    } else {
      const user = localStorage.getItem("user");
      if (user) {
        setUser(JSON.parse(user));
      } else {
        router.push("/");
      }
    }
  }, []);

  const toggleExpanded = (name) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  const handleItemClick = (item) => {
    if (item.subpages && item.subpages.length > 0) {
      toggleExpanded(item.name);
    } else {
      setMobileSidebarOpen(false);
    }
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  useEffect(() => {
    localStorage.setItem("theme", darkMode);
  }, [darkMode]);

  return (
    <div className={cn("min-h-screen bg-[#e1faf7]", darkMode && "dark")}>
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 sm:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-16",
          "hidden sm:block"
        )}
      >
        <div
          className="flex h-full flex-col bg-gradient-to-r bg-gradient-to-br  from-[#bce6dd] via-[#a8e0d8] to-[#b2e8f7]
 backdrop-blur-xl"
        >
          <div
            className={`flex h-16 items-center ${
              sidebarOpen ? "justify-between" : "justify-center"
            } px-4`}
          >
            {sidebarOpen && (
              <span className="text-2xl pt-8 font-bold bg-gradient-to-r from-teal-600 to-sky-700 dark:from-teal-200 dark:to-sky-300 bg-clip-text text-transparent">
                Smart Manufacturing
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-teal/30 dark:hover:bg-slate-800/50"
            >
              <Hamburger
                toggled={sidebarOpen}
                toggle={setSidebarOpen}
                size={20}
              />
            </Button>
          </div>

          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigationItems.map((item) => {
              const isActive = item.href === location;
              item.subpages &&
                item.subpages.some((sub) => location === sub.href);
              const hasSubpages = item.subpages && item.subpages.length > 0;
              const isExpanded = expandedItems.includes(item.name);

              return (
                <div key={item.name}>
                  <div
                    className={cn(
                      "flex items-center cursor-pointer rounded-lg p-2 gap-1 text-sm font-medium transition-all",
                      isActive ? "bg-primary" : "",
                      !sidebarOpen && "justify-center"
                    )}
                    onClick={() => handleItemClick(item)}
                  >
                    <Link
                      href={item.href}
                      className={`group flex flex-1 items-center h-max ${
                        sidebarOpen ? "" : "justify-center"
                      }`}
                      onClick={(e) => {
                        if (hasSubpages) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <div
                        className={cn(
                          "h-6 w-6 flex-shrink-0",
                          isActive ? "text-white" : "text-slate-500"
                        )}
                      >
                        {item.icon}
                      </div>
                      {sidebarOpen && (
                        <h5
                          className={cn(
                            "ml-2 truncate max-sm:hidden",
                            isActive ? "text-white" : ""
                          )}
                        >
                          {item.name}
                        </h5>
                      )}
                    </Link>
                    {hasSubpages && sidebarOpen && (
                      <div className="p-1 max-sm:hidden">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </div>

                  {hasSubpages && isExpanded && (
                    <div className="ml-4 space-y-1 max-sm:hidden">
                      {item.subpages.map((subpage) => {
                        const hasNestedSubpages =
                          subpage.subpages && subpage.subpages.length > 0;
                        const isNestedExpanded = expandedItems.includes(
                          subpage.name
                        );

                        return (
                          <div key={subpage.href}>
                            <div
                              className={cn(
                                "flex items-center cursor-pointer rounded-md px-1 py-2 text-sm transition-all",
                                location === subpage.href
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-slate-800/30"
                              )}
                              onClick={() => {
                                if (hasNestedSubpages) {
                                  toggleExpanded(subpage.name);
                                }
                              }}
                            >
                              <Link
                                href={subpage.href}
                                className="flex flex-1 items-center gap-2"
                                onClick={(e) => {
                                  if (hasNestedSubpages) {
                                    e.preventDefault();
                                  }
                                }}
                              >
                                {subpage.icon}
                                <span
                                  className={`ml-2 ${
                                    sidebarOpen ? "" : "hidden"
                                  }`}
                                >
                                  {subpage.name}
                                </span>
                              </Link>
                              {hasNestedSubpages && (
                                <div className="p-1">
                                  {isNestedExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </div>
                              )}
                            </div>

                            {hasNestedSubpages && isNestedExpanded && (
                              <div className="ml-6 space-y-1">
                                {subpage.subpages.map((nestedPage) => (
                                  <Link
                                    key={nestedPage.href}
                                    href={nestedPage.href}
                                    className={cn(
                                      "block rounded-md px-1 py-2 text-sm transition-all",
                                      location === nestedPage.href
                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-slate-800/30"
                                    )}
                                  >
                                    <span className="flex items-center gap-2">
                                      {nestedPage.icon}
                                      <span
                                        className={`ml-2 ${
                                          sidebarOpen ? "" : "hidden"
                                        }`}
                                      >
                                        {nestedPage.name}
                                      </span>
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out sm:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col backdrop-blur-xl bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <span className="text-xl font-bold bg-gradient-to-r from-sky-700 to-teal-500 dark:from-teal-200 dark:to-sky-300 bg-clip-text text-transparent">
              GTM Engine
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileSidebarOpen(false)}
              className="p-2 hover:bg-teal/30 dark:hover:bg-sky-800/50"
            >
              <Hamburger
                toggled={mobileSidebarOpen}
                toggle={setMobileSidebarOpen}
                size={20}
              />
            </Button>
          </div>

          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigationItems.map((item) => {
              const isActive = location === item.href;
              const hasSubpages = item.subpages && item.subpages.length > 0;
              const isExpanded = expandedItems.includes(item.name);
              item.subpages &&
                item.subpages.some((sub) => location === sub.href);

              return (
                <div key={item.name}>
                  <div
                    className={cn(
                      "flex items-center cursor-pointer rounded-lg px-2 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "bg-gradient-to-r from-teal-500 to-sky-500 text-white "
                        : "text-slate-700 dark:text-slate-300 hover:bg-teal/50 dark:hover:bg-sky-800/50"
                    )}
                    onClick={() => handleItemClick(item)}
                  >
                    <Link
                      href={item.href}
                      className="group flex flex-1 items-center"
                      onClick={(e) => {
                        if (hasSubpages) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 flex-shrink-0",
                          isActive ? "text-white" : "text-slate-500"
                        )}
                      >
                        {item.icon}
                      </div>
                      <span className="ml-3 truncate">{item.name}</span>
                    </Link>
                    {hasSubpages && (
                      <div className="p-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </div>

                  {hasSubpages && isExpanded && (
                    <div className="ml-2 mt-1 space-y-1">
                      {item.subpages.map((subpage) => {
                        const hasNestedSubpages =
                          subpage.subpages && subpage.subpages.length > 0;
                        const isNestedExpanded = expandedItems.includes(
                          subpage.name
                        );

                        return (
                          <div key={subpage.href}>
                            <div
                              className={cn(
                                "flex items-center cursor-pointer rounded-md px-1 py-2 text-sm transition-all",
                                location === subpage.href
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-slate-800/30"
                              )}
                              onClick={() => {
                                if (hasNestedSubpages) {
                                  toggleExpanded(subpage.name);
                                } else {
                                  setMobileSidebarOpen(false);
                                }
                              }}
                            >
                              <Link
                                href={subpage.href}
                                className="flex flex-1 items-center gap-2"
                                onClick={(e) => {
                                  if (hasNestedSubpages) {
                                    e.preventDefault();
                                  } else {
                                    setMobileSidebarOpen(false);
                                  }
                                }}
                              >
                                {subpage.icon}
                                {subpage.name}
                              </Link>
                              {hasNestedSubpages && (
                                <div className="p-1">
                                  {isNestedExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </div>
                              )}
                            </div>

                            {hasNestedSubpages && isNestedExpanded && (
                              <div className="ml-4 space-y-1">
                                {subpage.subpages.map((nestedPage) => (
                                  <Link
                                    key={nestedPage.href}
                                    href={nestedPage.href}
                                    onClick={() => setMobileSidebarOpen(false)}
                                    className={cn(
                                      "block rounded-md px-1 py-2 text-sm transition-all",
                                      location === nestedPage.href
                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-slate-800/30"
                                    )}
                                  >
                                    <span className="flex items-center gap-2">
                                      {nestedPage.icon}
                                      {nestedPage.name}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      <div
        className={cn(
          "transition-all duration-300 ease-in-out min-h-screen",
          sidebarOpen ? "ml-64" : "ml-16",
          "max-sm:ml-0"
        )}
      >
        <div className="sticky top-0 z-40 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-end px-4 sm:px-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 hover:bg-teal/30 dark:hover:bg-sky-800/50 sm:hidden"
            >
              <Hamburger
                toggled={mobileSidebarOpen}
                toggle={setMobileSidebarOpen}
                size={20}
              />
            </Button>
            <div className="flex-1">
              <div className="max-w-md min-w-0 ml-2 sm:ml-0"></div>
            </div>
            {user &&
              type === "admin" &&
              (user.refresh_token == null || user.refresh_token == "") && (
                <div className="flex items-center gap-4">
                  <AlertTriangleIcon
                    className="cursor-pointer"
                    onMouseOver={() => setAlertMessage((prev) => !prev)}
                  />
                  {alertMessage && (
                    <div className="flex items-center space-x-2 bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded">
                      <Label className="text-sm text-slate-600 dark:text-slate-400 ">
                        "Please connect your Gmail to automatically send emails
                        to Leads."
                      </Label>
                      <Link
                        href="/api/auth/email"
                        className="text-blue-500 hover:underline"
                      >
                        Connect Gmail
                      </Link>
                    </div>
                  )}
                </div>
              )}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="lm"
                    className="hidden sm:flex items-center space-x-2 whitespace-nowrap"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden md:inline">Settings</span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56 backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border-white/30 dark:border-slate-700/50">
                  <DropdownMenuItem onClick={() => router.push("/prospects")}>
                    Company Details
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => router.push("/generate-quote")}
                  ></DropdownMenuItem>
                  <TemplateCreator />

                  {/* <DropdownMenuItem
                    onClick={() => router.push("/configuration")}
                  >
                    Configuration Settings
                  </DropdownMenuItem> */}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex items-center space-x- whitespace-nowrap"
              >
                <HelpCircle className="h-4 w-4 cursor-pointer" />
                <span className="hidden md:inline cursor-pointer">
                  Contact Us
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="sm:hidden p-2 hover:bg-white/30 dark:hover:bg-sky-800/50"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2 hover:bg-white/30 dark:hover:bg-sky-800/50 cursor-pointer"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <UserButton className="cursor-pointer" />
            </div>
          </div>
        </div>

        <main className="p-4 sm:p-4 md:p-6 overflow-x-hidden">
          <div className="max-w-full min-w-0">{children}</div>
        </main>
      </div>

      

      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={() => setBotOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <Bot className="h-8 w-8" />
        </Button>
      </div> 
      {botOpen && <ChatPage onClose={() => setBotOpen(false)} />}
   


    </div>
  );
}
