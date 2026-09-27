import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registers the device for Expo push notifications and sends the token
 * to the API server so status-change notifications can be delivered.
 *
 * Push tokens require a physical device.
 * Android 13+ requires a notification channel before token registration.
 * Standalone (EAS) builds need `extra.eas.projectId` in app.json.
 */
export function usePushNotifications(deviceId: string) {
  const registered = useRef(false);

  useEffect(() => {
    if (!deviceId || registered.current || Platform.OS === 'web') return;
    registered.current = true;

    (async () => {
      try {
        // Android 13+ requires a channel before requesting the push token
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Talep Bildirimleri',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#00C8B3',
            sound: 'default',
          });
        }

        // Request permission
        const existingPerms = await Notifications.getPermissionsAsync();
        // PermissionResponse.granted is present at runtime (TS type mismatch with some versions)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let granted: boolean = (existingPerms as any).granted ?? false;
        if (!granted) {
          const req = await Notifications.requestPermissionsAsync();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          granted = (req as any).granted ?? false;
        }
        if (!granted) {
          console.log('[PushNotifications] Permission not granted — skipping registration');
          return;
        }

        // Resolve Expo project ID (required for EAS standalone builds)
        const projectId: string | undefined =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((Constants as any).easConfig?.projectId as string | undefined) ??
          (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        const pushToken = tokenData.data;
        console.log('[PushNotifications] Token obtained:', pushToken.slice(0, 30) + '...');

        // Register with server
        const serverRes = await fetch(`${API_BASE}/api/devices/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-device-id': deviceId,
          },
          body: JSON.stringify({ pushToken }),
        });

        if (!serverRes.ok) {
          console.warn('[PushNotifications] Server registration failed:', serverRes.status);
        } else {
          console.log('[PushNotifications] Token registered with server');
        }
      } catch (err) {
        // Explicit log — not a silent discard — so registration failures surface during testing
        console.warn('[PushNotifications] Registration error:', err);
      }
    })();
  }, [deviceId]);
}
