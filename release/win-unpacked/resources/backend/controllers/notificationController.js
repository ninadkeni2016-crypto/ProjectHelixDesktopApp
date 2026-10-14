import { notificationRepository } from "../repositories/NotificationRepository.js";

export async function getNotifications(req, res) {
  try {
    const notifications = await notificationRepository.find({ user: req.user._id }, null, { sort: { createdAt: -1 } });
    return res.json(notifications);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error fetching notifications" });
  }
}

export async function markAsRead(req, res) {
  try {
    const notification = await notificationRepository.update(req.params.id, { read: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    return res.json(notification);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error marking notification as read" });
  }
}

export async function clearAllNotifications(req, res) {
  try {
    await notificationRepository.deleteMany({ user: req.user._id });
    return res.json({ message: "All notifications cleared" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error clearing notifications" });
  }
}
