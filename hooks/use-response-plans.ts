"use client";

import { useSyncExternalStore } from "react";
import {
  getResponsePlansServerSnapshot,
  getResponsePlansSnapshot,
  subscribeResponsePlansRegistry,
} from "@/stores/response-plans-store";

export function useResponsePlansRegistry() {
  return useSyncExternalStore(
    subscribeResponsePlansRegistry,
    getResponsePlansSnapshot,
    getResponsePlansServerSnapshot,
  );
}
