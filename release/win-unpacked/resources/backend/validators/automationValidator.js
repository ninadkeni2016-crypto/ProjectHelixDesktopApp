import { body } from "express-validator";

export const toggleRules = [
  body("enabled").isBoolean().withMessage("Enabled property must be a boolean value"),
];
