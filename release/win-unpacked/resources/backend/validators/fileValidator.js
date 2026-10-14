import { body } from "express-validator";

export const renameRules = [
  body("newName").notEmpty().withMessage("New filename is required").trim(),
];

export const tagRules = [
  body("tags").isArray().withMessage("Tags must be provided as a string array"),
];
