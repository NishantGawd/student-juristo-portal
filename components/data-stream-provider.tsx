"use client";

import type { DataUIPart } from "ai";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { CustomUIDataTypes } from "@/lib/types";

type DataStreamState = DataUIPart<CustomUIDataTypes>[];
type DataStreamSetter = React.Dispatch<React.SetStateAction<DataStreamState>>;

// 1. Split into TWO contexts
const DataStreamStateContext = createContext<DataStreamState | null>(null);
const DataStreamSetterContext = createContext<DataStreamSetter | null>(null);

export function DataStreamProvider({ children }: { children: ReactNode }) {
  const [dataStream, setDataStream] = useState<DataStreamState>([]);

  return (
    // 2. Wrap them. The setter context wraps the state context.
    // Because the setter's identity never changes, components consuming ONLY the setter will never re-render!
    <DataStreamSetterContext.Provider value={setDataStream}>
      <DataStreamStateContext.Provider value={dataStream}>
        {children}
      </DataStreamStateContext.Provider>
    </DataStreamSetterContext.Provider>
  );
}

// 3. Create distinct hooks
export function useDataStreamState() {
  const context = useContext(DataStreamStateContext);
  if (!context) {
    return [];
  }
  return context;
}

export function useDataStreamSetter() {
  const context = useContext(DataStreamSetterContext);
  if (!context) {
    return () => {};
  }
  return context;
}