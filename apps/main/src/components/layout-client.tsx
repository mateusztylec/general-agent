"use client";

import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";

// All the client wrappers are here (they can't be in server components)
// 1. NextTopLoader: Show a progress bar at the top when navigating between pages
// 2. Toaster: Show success/error messages anywhere with toast()
const ClientLayout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      {/* Show a progress bar at the top when navigating between pages */}
      <NextTopLoader color="var(--primary)" showSpinner={false} />

      {/* Content inside app/page.js files  */}
      {children}

      {/* Toasts */}
      <Toaster toastOptions={{ duration: 3000 }} />
    </>
  );
};

export default ClientLayout;
