import React, { createContext, useContext, useEffect, useState } from 'react';
import { createFallbackShowroomV2Data, fetchShowroomV2Data, ShowroomV2Data } from './adapter';

const initialFallbackData: ShowroomV2Data = createFallbackShowroomV2Data();
const ShowroomContext = createContext<ShowroomV2Data>(initialFallbackData);

export function ShowroomProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ShowroomV2Data>(initialFallbackData);

  useEffect(() => {
    let mounted = true;
    fetchShowroomV2Data().then((resolvedData) => {
      if (mounted) setData(resolvedData);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ShowroomContext.Provider value={data}>
      {children}
    </ShowroomContext.Provider>
  );
}

export function useShowroomData(): ShowroomV2Data {
  const context = useContext(ShowroomContext);
  if (!context) {
    throw new Error('useShowroomData must be used within a ShowroomProvider');
  }
  return context;
}
