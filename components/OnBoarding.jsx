"use client";

import React from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const OnBoarding = () => {
  const router = useRouter();
  const [dots, setDots] = React.useState([]);

  React.useEffect(() => {
    const newDots = [...Array(20)].map((_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`,
    }));
    setDots(newDots);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-teal-400/20 to-sky-400/20 dark:from-teal-400/30 dark:to-sky-400/30 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div
          className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-sky-400/20 to-teal-400/20 dark:from-sky-400/30 dark:to-teal-400/30 rounded-full mix-blend-multiply filter blur-xl animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute -bottom-8 left-40 w-80 h-80 bg-gradient-to-r from-cyan-400/20 to-teal-400/20 dark:from-cyan-400/30 dark:to-teal-400/30 rounded-full mix-blend-multiply filter blur-xl animate-float"
          style={{ animationDelay: "4s" }}
        ></div>

        <div className="absolute inset-0 opacity-10 dark:opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(100,100,100,0.3) 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          ></div>
        </div>

        <div className="absolute inset-0">
          {dots.map((dot, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse-slow"
              style={{
                left: dot.left,
                top: dot.top,
                animationDelay: dot.delay,
                animationDuration: dot.duration,
              }}
            ></div>
          ))}
        </div>
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80 border border-white/30 dark:border-slate-700/50 shadow-2xl">
          <div className="p-8 text-center">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                GTM Engine
              </h1>
              <div className="w-20 h-1 bg-gradient-to-r from-sky-700 to-teal-500 mx-auto rounded-full"></div>
            </div>

            <p className="text-lg text-slate-700 dark:text-slate-300 mb-8 leading-relaxed">
              Enter the Engine Room of Your GTM Strategy
            </p>

            <Button
              className="w-full h-12 backdrop-blur-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white/70 dark:hover:bg-slate-800/70 border border-white/30 dark:border-slate-700/50 text-slate-900 dark:text-white font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 group cursor-pointer"
              variant="outline"
              onClick={() => {
                localStorage.setItem("type", "admin");
                signIn("google", { callbackUrl: "/on-boarding" });
              }}
            >
              <svg
                className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <Button
              className="w-full mt-4 h-12 backdrop-blur-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white/70 dark:hover:bg-slate-800/70 border border-white/30 dark:border-slate-700/50 text-slate-900 dark:text-white font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 group cursor-pointer"
              variant="outline"
              onClick={() => router.push("/employee-login")}
            >
              Employee Login
            </Button>

            <div className="mt-8 flex justify-center space-x-2">
              <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OnBoarding;
