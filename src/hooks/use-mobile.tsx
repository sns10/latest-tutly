import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Cache the initial value to avoid layout thrashing
const getIsMobile = () => 
  typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false

export function useIsMobile() {
  // Initialize with actual value to prevent hydration mismatch flash
  const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobile)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Use matchMedia event for better performance than resize
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    
    // Set initial value
    setIsMobile(mql.matches)
    
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
