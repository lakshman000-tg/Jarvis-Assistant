package com.jarvis.assistant;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

/**
 * Android Foreground Service — keeps JARVIS alive while minimized.
 *
 * Copy this file to:
 *   android/app/src/main/java/com/jarvis/assistant/ForegroundListenerService.java
 *
 * NOTE: This service keeps the process alive so the WebView continues
 * running (and the JS voice recognition loop continues) while the app
 * is minimized AND the screen is still ON.
 *
 * Automatic pause when screen turns OFF is handled by the JS layer
 * via the Page Visibility API — the WebView will pause JS execution
 * when Android suspends it (screen off / lock screen).
 */
public class ForegroundListenerService extends Service {

    private static final String CHANNEL_ID = "jarvis_listener_channel";
    private static final int NOTIF_ID = 9001;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();

        // Partial wake lock keeps CPU alive while screen is on
        // Released automatically when screen turns off
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Jarvis::ListenerLock");
            wakeLock.acquire(30 * 60 * 1000L); // max 30 min, auto-release
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIF_ID, buildNotification());
        // Restart service if killed by system
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    private Notification buildNotification() {
        // Tapping notification opens the app
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("JARVIS is active")
            .setContentText("Tap to open assistant")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setColor(0x00FFFF)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "JARVIS Listener",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps JARVIS listening in the background");
            channel.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }
}
