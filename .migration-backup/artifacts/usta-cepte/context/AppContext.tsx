import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export interface RequestForm {
  categoryId: string;
  categoryName: string;
  selectedCategoryIds: string[];
  selectedCategoryNames: string[];
  semt: string;
  mahalle: string;
  sokak: string;
  title: string;
  description: string;
  priority: 'Acil' | 'Bugün' | 'Planlı';
  timeRange: string;
  photos: string[];
  customerLatitude?: number;
  customerLongitude?: number;
  houseType?: string;
  cleaningTeamSize?: string;
  serviceDetail?: string;
}

export interface ServiceRequest {
  id: number;
  userName: string;
  categoryId: string;
  categoryName: string;
  title: string;
  description?: string;
  priority: string;
  timeRange?: string;
  semt: string;
  mahalle: string;
  sokak?: string;
  status: string;
  assignedUstaId?: string | null;
  customerLatitude?: number | null;
  customerLongitude?: number | null;
  artisanLatitude?: number | null;
  artisanLongitude?: number | null;
  trackingStatus?: string;
  canManage?: boolean;
  canReview?: boolean;
  isAssignedProfessional?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: number;
  ustaId?: number | null;
  requestId?: number | null;
  type: string;
  title: string;
  body: string;
  read: boolean;
  deliveryStatus: string;
  createdAt: string;
}

export interface UstaLocation {
  id: number;
  ustaId: number;
  ustaName: string;
  specialty: string;
  categoryId: string;
  lat: number;
  lng: number;
  heading?: number;
  isOnline: string;
}

export interface SubscriptionState {
  active: boolean;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  monthlyFee: number;
  referenceCode: string;
}

interface AppContextValue {
  // Request form (wizard)
  form: RequestForm;
  setForm: (updates: Partial<RequestForm>) => void;
  resetForm: () => void;

  // Requests list
  requests: ServiceRequest[];
  loadRequests: () => Promise<void>;
  submitRequest: (assignedUstaId?: number | null, categoryOverride?: { id: string; name: string }) => Promise<ServiceRequest | null>;
  isSubmitting: boolean;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  loadNotifications: () => Promise<void>;
  markNotificationRead: (id: number) => Promise<void>;

  // Live usta locations
  ustaLocations: UstaLocation[];
  loadLocations: () => Promise<void>;

  // User info
  userName: string;
  setUserName: (name: string) => void;

  // Stable per-device identity used for ownership checks on the API
  deviceId: string;
  subscription: SubscriptionState | null;
  loadSubscription: () => Promise<void>;
}

const DEFAULT_FORM: RequestForm = {
  categoryId: '',
  categoryName: '',
  selectedCategoryIds: [],
  selectedCategoryNames: [],
  semt: '',
  mahalle: '',
  sokak: '',
  title: '',
  description: '',
  priority: 'Bugün',
  timeRange: 'Bugün 16:00 – 19:00',
  photos: [],
  houseType: '',
  cleaningTeamSize: '',
  serviceDetail: '',
};

const AppContext = createContext<AppContextValue | null>(null);

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [form, setFormState] = useState<RequestForm>(DEFAULT_FORM);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [ustaLocations, setUstaLocations] = useState<UstaLocation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [userName, setUserNameState] = useState('Misafir');
  const [deviceId, setDeviceId] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);

  // Load user name from storage
  useEffect(() => {
    AsyncStorage.getItem('userName').then((name) => {
      if (name) setUserNameState(name);
    });
    // Load or create a stable device id
    AsyncStorage.getItem('deviceId').then((stored) => {
      if (stored) {
        setDeviceId(stored);
      } else {
        const fresh = Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
        AsyncStorage.setItem('deviceId', fresh);
        setDeviceId(fresh);
      }
    });
  }, []);

  const setUserName = useCallback((name: string) => {
    setUserNameState(name);
    AsyncStorage.setItem('userName', name);
  }, []);

  const loadSubscription = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API_BASE}/api/subscription?user_id=${encodeURIComponent(deviceId)}`, {
        headers: { 'x-device-id': deviceId },
      });
      if (res.ok) setSubscription(await res.json());
    } catch {
      // The home screen remains usable when billing is temporarily unavailable.
    }
  }, [deviceId]);

  const setForm = useCallback((updates: Partial<RequestForm>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(DEFAULT_FORM);
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/requests`, { headers: { 'x-device-id': deviceId } });
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data);
    } catch {
      // Network error – use cached
    }
  }, [deviceId]);

  const loadNotifications = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, { headers: { 'x-device-id': deviceId } });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadNotificationCount(data.unreadCount ?? 0);
    } catch {
      // Keep the last notification list during a temporary network error.
    }
  }, [deviceId]);

  const markNotificationRead = useCallback(async (id: number) => {
    if (!deviceId) return;
    const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: { 'x-device-id': deviceId },
    });
    if (res.ok) {
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
      setUnreadNotificationCount((count) => Math.max(0, count - 1));
    }
  }, [deviceId]);

  const loadLocations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/locations`);
      if (!res.ok) return;
      const data = await res.json();
      setUstaLocations(data);
    } catch {
      // Silent fail
    }
  }, []);

  // Supabase Realtime — live updates for usta_locations.
  // Falls back to periodic polling when Supabase is not configured.
  useEffect(() => {
    // Helper: map snake_case Supabase row → camelCase UstaLocation
    function rowToLocation(row: Record<string, unknown>): UstaLocation {
      return {
        id: row.usta_id as number,
        ustaId: row.usta_id as number,
        ustaName: row.usta_name as string,
        specialty: row.specialty as string,
        categoryId: row.category_id as string,
        lat: row.lat as number,
        lng: row.lng as number,
        heading: row.heading != null ? (row.heading as number) : undefined,
        isOnline: row.is_online as string,
      };
    }

    const client = supabase; // capture so TypeScript can narrow and cleanup can reference it

    if (!client) {
      // Supabase not configured — poll every 10 s as a lightweight fallback
      const interval = setInterval(loadLocations, 10_000);
      return () => clearInterval(interval);
    }

    const channel = client
      .channel('usta_locations_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usta_locations' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as Record<string, unknown>).usta_id as number;
            setUstaLocations((prev) => prev.filter((l) => l.ustaId !== oldId));
          } else {
            // INSERT or UPDATE
            const updated = rowToLocation(payload.new as Record<string, unknown>);
            if (updated.isOnline !== 'true') {
              // Usta went offline — remove from map
              setUstaLocations((prev) => prev.filter((l) => l.ustaId !== updated.ustaId));
            } else {
              setUstaLocations((prev) => {
                const exists = prev.some((l) => l.ustaId === updated.ustaId);
                return exists
                  ? prev.map((l) => (l.ustaId === updated.ustaId ? updated : l))
                  : [...prev, updated];
              });
            }
          }
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadLocations]);

  const submitRequest = useCallback(async (assignedUstaId?: number | null, categoryOverride?: { id: string; name: string }): Promise<ServiceRequest | null> => {
    setIsSubmitting(true);
    try {
      const body = {
        assignedUstaId: assignedUstaId != null ? String(assignedUstaId) : undefined,
        userName,
        categoryId: categoryOverride?.id ?? form.categoryId,
        categoryName: categoryOverride?.name ?? form.categoryName,
        title: form.title || `${categoryOverride?.name ?? form.categoryName} talebi`,
        description: [
          form.description,
          form.houseType ? `İşin yapılacağı ev tipi: ${form.houseType}` : '',
          form.cleaningTeamSize ? `Temizlik ekibi: ${form.cleaningTeamSize}` : '',
          form.serviceDetail ? `Hizmet detayı: ${form.serviceDetail}` : '',
        ].filter(Boolean).join('\n'),
        priority: form.priority,
        timeRange: form.timeRange,
        semt: form.semt,
        mahalle: form.mahalle,
        sokak: form.sokak,
        photos: form.photos,
        customerLatitude: form.customerLatitude,
        customerLongitude: form.customerLongitude,
      };
      const res = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const created: ServiceRequest = await res.json();
      setRequests((prev) => [created, ...prev]);
      return created;
    } catch {
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [form, userName, deviceId]);

  // Initial load
  useEffect(() => {
    loadRequests();
    loadLocations();
    loadNotifications();
  }, [loadRequests, loadLocations, loadNotifications]);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  return (
    <AppContext.Provider
      value={{
        form,
        setForm,
        resetForm,
        requests,
        loadRequests,
        submitRequest,
        isSubmitting,
        notifications,
        unreadNotificationCount,
        loadNotifications,
        markNotificationRead,
        ustaLocations,
        loadLocations,
        userName,
        setUserName,
        deviceId,
        subscription,
        loadSubscription,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
