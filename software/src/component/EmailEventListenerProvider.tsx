"use client";

import { useEffect } from "react";
import {
  initializeEmailEventListener,
  cleanupEmailEventListener,
} from "@/lib/emailEventListener";

/**
 * Provider component that initializes the email event listener
 * This component should be placed inside the FireStatusProvider
 */
export default function EmailEventListenerProvider() {
  useEffect(() => {
    // Initialize the email event listener when component mounts
    initializeEmailEventListener();

    // Cleanup when component unmounts
    return () => {
      cleanupEmailEventListener();
    };
  }, []);

  return null; // This component doesn't render anything
}
