import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { currentDateRange, getActiveDateRange, setActiveDateRange, type DateRange } from "./date-range";

type DateRangeContextValue = { range: DateRange; setRange: (range: DateRange) => void };
const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [range, setRangeState] = useState<DateRange>(() => getActiveDateRange() ?? currentDateRange());
  const setRange = useCallback((next: DateRange) => {
    setActiveDateRange(next);
    setRangeState(next);
    void queryClient.invalidateQueries({ refetchType: "active" });
  }, [queryClient]);
  const value = useMemo(() => ({ range, setRange }), [range, setRange]);
  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
}

export function useDateRange(): DateRangeContextValue {
  const value = useContext(DateRangeContext);
  if (!value) throw new Error("useDateRange must be used within DateRangeProvider");
  return value;
}
