/**
 * Local "Sage is getting hungry" reminders via expo-notifications.
 *
 * We schedule a single local notification for the moment Sage is predicted to drop into the
 * "hungry" band (from the backend's `hours_until_hungry`), and reschedule it every time the pet
 * state refreshes (after a feed, or on app foreground). No server/push infra needed.
 *
 * Note: fully reliable only in a dev/standalone build — Expo Go has limited notification support
 * on SDK 54. All calls are wrapped so the app never crashes if the module/permission is absent.
 */
import * as Notifications from 'expo-notifications';

import type { SagePet } from '../../types/api';

let configured = false;

async function ensurePermission(): Promise<boolean> {
  try {
    if (!configured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      configured = true;
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch {
    return false;
  }
}

/** (Re)schedule the hunger reminder based on Sage's predicted time-to-hungry. */
export async function scheduleHungerReminder(sage: SagePet): Promise<void> {
  try {
    if (!(await ensurePermission())) return;
    await Notifications.cancelAllScheduledNotificationsAsync();

    // If already hungry/fainted, nudge soon; otherwise schedule for when he'll get hungry.
    const seconds = Math.max(60, Math.round(sage.hours_until_hungry * 3600));
    const body = sage.is_dormant
      ? `${sage.name} fainted from hunger — cook a meal to revive them! 😵`
      : `${sage.name} is getting peckish 🥄 — what are we cooking today?`;

    await Notifications.scheduleNotificationAsync({
      content: { title: `${sage.name} misses you`, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
  } catch {
    // Notifications unavailable (e.g. Expo Go) — ignore.
  }
}
