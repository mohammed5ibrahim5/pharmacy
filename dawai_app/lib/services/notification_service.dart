import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._();
  factory NotificationService() => _instance;
  NotificationService._();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _plugin.initialize(settings);

    final androidImplementation = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await androidImplementation?.requestNotificationsPermission();

    _initialized = true;
  }

  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'dawai_channel',
      'إشعارات دوا',
      channelDescription: 'إشعارات حالة الطلبات والتذكيرات',
      importance: Importance.high,
      priority: Priority.high,
    );
    const details = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(),
    );
    await _plugin.show(id, title, body, details);
  }

  Future<void> showOrderStatusNotification(String orderId, String status) async {
    final labels = {
      'pending': 'قيد المراجعة',
      'confirmed': 'تم التأكيد',
      'shipped': 'في الطريق',
      'delivered': 'تم التسليم',
      'cancelled': 'ملغي',
    };
    await showNotification(
      id: orderId.hashCode,
      title: 'تحديث الطلب #$orderId',
      body: 'حالة الطلب: ${labels[status] ?? status}',
    );
  }

  Future<void> showRefillReminder(String productName) async {
    await showNotification(
      id: 'refill_$productName'.hashCode,
      title: 'تذكير إعادة الطلب',
      body: 'حان وقت إعادة طلب $productName',
    );
  }
}
