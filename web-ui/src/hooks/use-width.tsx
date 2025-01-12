import * as React from "react"


export function useWidth(ref: React.RefObject<HTMLDivElement>) {
    const [width, setWidth] = React.useState(0);

    React.useEffect(():any => {
        if (!ref.current) return 300;
        setWidth(ref.current.offsetWidth);
    }, [])

  return width
}
