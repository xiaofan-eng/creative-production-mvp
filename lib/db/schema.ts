import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// 任务记录
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskType: text("task_type", { enum: ["new_product", "relaunch", "low_performance"] }).notNull(),
  productId: integer("product_id").notNull(),
  status: text("status", { enum: ["pending", "generating", "completed", "failed"] }).notNull().default("pending"),
  generateType: text("generate_type"), // "script" | "image_brief" | "storyboard" | null
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// 商品原始信息
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  price: text("price"),
  targetAudience: text("target_audience"),
  productImages: text("product_images"),
  competitorMaterials: text("competitor_materials"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// 商品结构化画像
export const productProfiles = sqliteTable("product_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  category: text("category"),
  priceRange: text("price_range"),
  sellingPoints: text("selling_points"), // JSON
  restrictions: text("restrictions"), // JSON
  missingFields: text("missing_fields"), // JSON
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// 内容版本（核心输出表）
export const contentVersions = sqliteTable("content_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  packageIndex: integer("package_index").notNull(), // 1, 2, 3
  contentAngle: text("content_angle").notNull(),
  script: text("script").notNull(),
  imageBrief: text("image_brief"), // JSON
  storyboard: text("storyboard"), // JSON
  riskFlags: text("risk_flags"), // JSON
  manualCheckItems: text("manual_check_items"), // JSON
  recommendReason: text("recommend_reason"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// 用户反馈
export const feedback = sqliteTable("feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contentVersionId: integer("content_version_id").notNull(),
  adoptionStatus: text("adoption_status", { enum: ["adopted", "modified", "rejected"] }).notNull(),
  editNote: text("edit_note"),
  rejectionReason: text("rejection_reason", {
    enum: ["selling_point_inaccurate", "too_generic", "high_risk", "not_executable", "other"],
  }),
  module: text("module"), // "script" | "image_brief" | "storyboard"
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// 表现数据
export const performance = sqliteTable("performance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contentVersionId: integer("content_version_id").notNull(),
  impression: integer("impression"),
  click: integer("click"),
  ctr: real("ctr"),
  conversion: integer("conversion"),
  humanReviewNote: text("human_review_note"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// 主动触发记录
export const triggers = sqliteTable("triggers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  triggerType: text("trigger_type", { enum: ["low_ctr", "selling_point_inaccurate", "high_rejection"] }).notNull(),
  triggerReason: text("trigger_reason").notNull(),
  suggestion: text("suggestion").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
