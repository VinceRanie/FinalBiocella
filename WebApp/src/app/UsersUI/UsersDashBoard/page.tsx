"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UsersHome() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/UsersUI/UsersDashBoard/Features/UserCollection");
  }, [router]);

  return null;
}