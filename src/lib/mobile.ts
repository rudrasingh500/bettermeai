import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Toast } from '@capacitor/toast';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

export class MobileService {
  private static instance: MobileService;
  private initialized = false;

  private constructor() {}

  static getInstance(): MobileService {
    if (!MobileService.instance) {
      MobileService.instance = new MobileService();
    }
    return MobileService.instance;
  }

  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  async initialize() {
    if (this.initialized || !this.isNativePlatform()) return;

    // Initialize push notifications
    await this.initializePushNotifications();

    // Add app lifecycle listeners
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?:', isActive);
    });

    this.initialized = true;
  }

  private async initializePushNotifications() {
    if (!this.isNativePlatform()) return;

    try {
      // Request permission
      const permissionStatus = await PushNotifications.requestPermissions();
      
      if (permissionStatus.receive === 'granted') {
        // Register with FCM or APNS
        await PushNotifications.register();

        // Add listeners
        PushNotifications.addListener('registration', (token) => {
          console.log('Push registration success:', token.value);
          // Here you would typically send this token to your backend
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('Push registration failed:', err.error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed:', notification);
        });
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  async takePicture(source: CameraSource = CameraSource.Camera): Promise<string | null> {
    if (!this.isNativePlatform()) return null;

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source,
      });

      return image.base64String || null;
    } catch (error) {
      console.error('Error taking picture:', error);
      return null;
    }
  }

  async showLocalNotification(title: string, body: string) {
    if (!this.isNativePlatform()) return;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: new Date().getTime(),
            schedule: { at: new Date(Date.now()) },
          },
        ],
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  async showToast(message: string, duration: 'short' | 'long' = 'short') {
    if (!this.isNativePlatform()) return;

    await Toast.show({
      text: message,
      duration,
    });
  }

  async getDeviceInfo() {
    if (!this.isNativePlatform()) return null;

    try {
      const info = await Device.getInfo();
      return info;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }

  async storeData(key: string, value: string) {
    if (!this.isNativePlatform()) return;

    try {
      await Preferences.set({ key, value });
    } catch (error) {
      console.error('Error storing data:', error);
    }
  }

  async getData(key: string): Promise<string | null> {
    if (!this.isNativePlatform()) return null;

    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (error) {
      console.error('Error getting data:', error);
      return null;
    }
  }

  async removeData(key: string) {
    if (!this.isNativePlatform()) return;

    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error('Error removing data:', error);
    }
  }
}

export const mobileService = MobileService.getInstance(); 