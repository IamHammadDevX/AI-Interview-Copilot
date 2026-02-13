"use client";

import { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { Tooltip } from "react-tooltip";


const ClientLayout = ({ children }: { children: ReactNode }) => {
  return (
    <>
        {children}

        <Toaster
          toastOptions={{
            duration: 3000,
          }}
        />
        <Tooltip
          id="tooltip"
          className="z-60 opacity-100! max-w-sm shadow-lg"
        />
    </>
  );
};

export default ClientLayout;
