"use client";

import { logOut } from "@/app/(auth)/actions";

export const SignOutForm = () => {
  return (
    <div className="w-full">
      <button
        className="w-full px-1 py-0.5 text-left text-red-500"
        type="button"
        onClick={() => logOut()}
      >
        Sign out
      </button>
    </div>
  );
};

