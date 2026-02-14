"use client";

import { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";


const ClientLayout = ({ children }: { children: ReactNode }) => {
  return (
    <TooltipProvider>
      {children}
      <Toaster
        toastOptions={{
          duration: 3000,
        }}
      />
    </TooltipProvider>
  );
};

export default ClientLayout;
