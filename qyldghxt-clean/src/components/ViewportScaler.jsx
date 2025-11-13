import React, { useEffect, useMemo, useState } from 'react'

const ViewportScaler = ({ baseWidth = 1440, baseHeight = 900, minScale = 0.75, maxScale = 1.5, children }) => {
  const [scale, setScale] = useState(1)

  const computeScale = () => {
    const vw = window.innerWidth
    const sx = vw / baseWidth
    const s = Math.max(minScale, Math.min(maxScale, sx))
    setScale(s)
  }

  useEffect(() => {
    computeScale()
    const onResize = () => computeScale()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const outerStyle = useMemo(() => ({
    width: '100vw',
    height: '100vh',
    overflow: 'auto',
    background: 'transparent'
  }), [])

  const innerStyle = useMemo(() => ({
    width: `${baseWidth}px`,
    height: 'auto',
    transform: `scale(${scale})`,
    transformOrigin: 'top left'
  }), [scale, baseWidth])

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        {children}
      </div>
    </div>
  )
}

export default ViewportScaler
