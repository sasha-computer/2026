import { useEffect, useMemo, useRef } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'

type PolylineEventProps = {
  onClick?: (e: google.maps.MapMouseEvent) => void
  onDrag?: (e: google.maps.MapMouseEvent) => void
  onDragStart?: (e: google.maps.MapMouseEvent) => void
  onDragEnd?: (e: google.maps.MapMouseEvent) => void
  onMouseOver?: (e: google.maps.MapMouseEvent) => void
  onMouseOut?: (e: google.maps.MapMouseEvent) => void
}

type PolylineCustomProps = {
  encodedPath?: string
}

export type PolylineProps = google.maps.PolylineOptions &
  PolylineEventProps &
  PolylineCustomProps

export function Polyline(props: PolylineProps) {
  const {
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onMouseOver,
    onMouseOut,
    encodedPath,
    ...polylineOptions
  } = props

  const callbacks = useRef<Record<string, (e: unknown) => void>>({})
  Object.assign(callbacks.current, {
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onMouseOver,
    onMouseOut,
  })

  const geometryLibrary = useMapsLibrary('geometry')

  const polyline = useRef(new google.maps.Polyline()).current

  // Update polyline options when they change
  useMemo(() => {
    polyline.setOptions(polylineOptions)
  }, [polyline, polylineOptions])

  const map = useMap()

  // Update path from encoded path or regular path
  useMemo(() => {
    if (!geometryLibrary) return
    if (encodedPath) {
      const path = geometryLibrary.encoding.decodePath(encodedPath)
      polyline.setPath(path)
    } else if (polylineOptions.path) {
      polyline.setPath(polylineOptions.path)
    }
  }, [polyline, encodedPath, polylineOptions.path, geometryLibrary])

  // Add polyline to map
  useEffect(() => {
    if (!map) return

    polyline.setMap(map)

    return () => {
      polyline.setMap(null)
    }
  }, [map, polyline])

  // Set up event listeners
  useEffect(() => {
    if (!polyline) return

    const gme = google.maps.event
    ;[
      ['click', 'onClick'],
      ['drag', 'onDrag'],
      ['dragstart', 'onDragStart'],
      ['dragend', 'onDragEnd'],
      ['mouseover', 'onMouseOver'],
      ['mouseout', 'onMouseOut'],
    ].forEach(([eventName, callbackName]) => {
      gme.addListener(polyline, eventName, (e: google.maps.MapMouseEvent) => {
        const callback = callbacks.current[callbackName]
        if (callback) callback(e)
      })
    })

    return () => {
      gme.clearInstanceListeners(polyline)
    }
  }, [polyline])

  return null
}
