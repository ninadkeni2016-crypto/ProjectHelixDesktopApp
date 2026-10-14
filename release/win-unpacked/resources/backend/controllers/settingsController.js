import { settingsRepository } from "../repositories/SettingsRepository.js";
import { userRepository } from "../repositories/UserRepository.js";
import { auditLogRepository } from "../repositories/AuditLogRepository.js";

export async function getSettings(req, res) {
  try {
    let settings = await settingsRepository.findByUserId(req.user._id);
    if (!settings) {
      settings = await settingsRepository.create({
        notifications: true,
        aiSuggestions: true,
        autoBackup: true,
        privacyMode: false,
        theme: "Dark (Active)",
        accentColor: "#3b82f6",
        user: req.user._id,
      });
    }
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error fetching settings" });
  }
}

export async function updateSettings(req, res) {
  try {
    let settings = await settingsRepository.findByUserId(req.user._id);
    if (!settings) {
      settings = await settingsRepository.create({
        ...req.body,
        user: req.user._id
      });
    } else {
      settings = await settingsRepository.update(settings._id, req.body, { new: true });
    }

    await auditLogRepository.logEvent(req.user._id, "UPDATE_SETTINGS", req.body);
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error updating settings" });
  }
}

export async function updateProfileName(req, res) {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: "Name is required" });
  }

  try {
    await userRepository.update(req.user._id, { name });
    const user = await userRepository.model.findById(req.user._id).select("-password").exec();
    await auditLogRepository.logEvent(req.user._id, "UPDATE_PROFILE_NAME", { name });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error updating profile name" });
  }
}
