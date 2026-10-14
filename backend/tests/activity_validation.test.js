import Activity from "../models/Activity.js";
import mongoose from "mongoose";

describe("Activity Model Validation & Scanner Resilience", () => {
  it("should validate scanner-generated activity without iconType, label, time, and date", async () => {
    const userId = new mongoose.Types.ObjectId();
    const doc = new Activity({
      title: "Scan Triggered",
      desc: "Started local directory crawls under home path.",
      type: "project",
      user: userId,
    });

    const validationError = doc.validateSync();
    expect(validationError).toBeUndefined();
    expect(doc.label).toBe("Scan Triggered");
    expect(doc.title).toBe("Scan Triggered");
    expect(doc.desc).toBe("Started local directory crawls under home path.");
    expect(doc.iconType).toBe("Layers");
    expect(doc.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(doc.time).toBeDefined();
    expect(doc.status).toBe("completed");
    expect(doc.color).toBe("text-blue-400");
  });

  it("should validate file watcher activity without iconType, label, time, and date", async () => {
    const userId = new mongoose.Types.ObjectId();
    const doc = new Activity({
      title: "File Added",
      desc: "Indexed matching watch file: sample.pdf",
      type: "file",
      user: userId,
    });

    const validationError = doc.validateSync();
    expect(validationError).toBeUndefined();
    expect(doc.label).toBe("File Added");
    expect(doc.iconType).toBe("FileText");
    expect(doc.color).toBe("text-green-400");
  });

  it("should preserve explicitly provided iconType, label, time, and date", async () => {
    const userId = new mongoose.Types.ObjectId();
    const doc = new Activity({
      date: "2026-07-23",
      time: "11:42 AM",
      type: "download",
      label: "Downloaded Node.js Installer",
      iconType: "Download",
      color: "text-blue-400",
      user: userId,
    });

    const validationError = doc.validateSync();
    expect(validationError).toBeUndefined();
    expect(doc.date).toBe("2026-07-23");
    expect(doc.time).toBe("11:42 AM");
    expect(doc.label).toBe("Downloaded Node.js Installer");
    expect(doc.iconType).toBe("Download");
  });
});
