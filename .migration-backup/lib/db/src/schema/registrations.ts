import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // 'customer' | 'craftsman' | 'admin'
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // customer fields
  district: text("district"),
  serviceAreas: text("service_areas").array().default([]),
  address: text("address"),
  // craftsman fields
  specialty: text("specialty"),
  specialties: text("specialties").array().default([]),
  categoryId: text("category_id"),
  experience: text("experience"),
  about: text("about"),
  idNumber: text("id_number"),
  // admin fields
  adminCode: text("admin_code"),
  department: text("department"),
  // shared
  kvkkConsent: boolean("kvkk_consent").default(false),
  kvkkConsentAt: timestamp("kvkk_consent_at", { withTimezone: true }),
  kvkkConsentVersion: text("kvkk_consent_version"),
  isApproved: boolean("is_approved").default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
