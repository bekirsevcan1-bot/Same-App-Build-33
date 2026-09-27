/**
 * Web stub for react-native-maps.
 * react-native-maps is a native-only module and cannot run on web.
 * The harita.web.tsx screen provides a web-specific fallback UI.
 */
import React from 'react';
import { View } from 'react-native';

const noop = () => null;

const MapView = React.forwardRef((props, ref) => React.createElement(View, { ref, ...props }));
MapView.displayName = 'MapView';

export default MapView;
export const Marker = noop;
export const Circle = noop;
export const Polyline = noop;
export const Polygon = noop;
export const Callout = noop;
export const CalloutSubview = noop;
export const Overlay = noop;
export const Heatmap = noop;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;
export const AnimatedMapView = MapView;
export const MAP_TYPES = {
  STANDARD: 'standard',
  SATELLITE: 'satellite',
  HYBRID: 'hybrid',
  TERRAIN: 'terrain',
  NONE: 'none',
  MUTEDSTANDARD: 'mutedStandard',
};
